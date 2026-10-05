const express = require("express");
const axios = require("axios");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in."
      });
    }

    const pool = req.app.locals.pool;

    const businessResult = await pool.query(
      `
      SELECT id
      FROM businesses
      WHERE user_id = $1
      `,
      [req.session.userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found."
      });
    }

    const businessId = businessResult.rows[0].id;

    const ordersResult = await pool.query(
      `
      SELECT
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_phone,
        o.customer_address,
        o.customer_city,
        o.customer_state,
        o.total_amount,
        o.status,
        o.payment_status,
        o.payment_reference,
        o.created_at,
        o.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'productId', oi.product_id,
              'productName', oi.product_name,
              'unitPrice', oi.unit_price,
              'quantity', oi.quantity,
              'subtotal', oi.subtotal
            )
            ORDER BY oi.id ASC
          ),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi
        ON oi.order_id = o.id
      WHERE o.business_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `,
      [businessId]
    );

    res.json({
      success: true,
      orders: ordersResult.rows
    });
  } catch (error) {
    console.error("Get orders error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load orders."
    });
  }
});

router.patch("/:orderId/status", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in."
      });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status."
      });
    }

    const pool = req.app.locals.pool;

    const businessResult = await pool.query(
      `
      SELECT id
      FROM businesses
      WHERE user_id = $1
      `,
      [req.session.userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found."
      });
    }

    const businessId = businessResult.rows[0].id;

    const orderResult = await pool.query(
      `
      UPDATE orders
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND business_id = $3
      RETURNING
        id,
        order_number,
        status,
        payment_status,
        updated_at
      `,
      [status, orderId, businessId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully.",
      order: orderResult.rows[0]
    });
  } catch (error) {
    console.error(
      "Update order status error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to update order status."
    });
  }
});

router.post("/", async (req, res) => {
  const pool = req.app.locals.pool;
  const client = await pool.connect();

  try {
    const {
      slug,
      customerName,
      customerPhone,
      customerAddress,
      customerCity,
      customerState,
      paymentReference,
      items
    } = req.body;

    if (
      !slug ||
      !customerName ||
      !customerPhone ||
      !customerAddress ||
      !customerCity ||
      !customerState
    ) {
      return res.status(400).json({
        success: false,
        message: "All customer information is required."
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty."
      });
    }

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required."
      });
    }

    const businessResult = await pool.query(
      `
      SELECT id
      FROM businesses
      WHERE slug = $1
      `,
      [slug]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found."
      });
    }

    const businessId = businessResult.rows[0].id;

    const paymentResponse = await axios.get(
      "https://api.paystack.co/transaction/verify/" +
        encodeURIComponent(paymentReference),
      {
        headers: {
          Authorization:
            "Bearer " + process.env.PAYSTACK_SECRET_KEY
        }
      }
    );

    const payment = paymentResponse.data.data;

    if (payment.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment has not been completed."
      });
    }

    await client.query("BEGIN");

    const productIds = items.map(
      (item) => Number(item.productId)
    );

    const uniqueProductIds = [
      ...new Set(productIds)
    ];

    const productsResult = await client.query(
      `
      SELECT
        id,
        name,
        price,
        discount_price,
        stock,
        status
      FROM products
      WHERE id = ANY($1::int[])
        AND business_id = $2
      FOR UPDATE
      `,
      [uniqueProductIds, businessId]
    );

    if (
      productsResult.rows.length !==
      uniqueProductIds.length
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "One or more products could not be found."
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productsResult.rows.find(
        (row) =>
          Number(row.id) ===
          Number(item.productId)
      );

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Invalid product quantity."
        });
      }

      if (product.status !== "active") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            product.name +
            " is no longer available."
        });
      }

      if (Number(product.stock) < quantity) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            product.name +
            " does not have enough stock."
        });
      }

      const unitPrice =
        product.discount_price !== null
          ? Number(product.discount_price)
          : Number(product.price);

      const subtotal =
        unitPrice * quantity;

      totalAmount += subtotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity,
        subtotal
      });
    }

    const paidAmount =
      Number(payment.amount) / 100;

    if (
      Math.abs(paidAmount - totalAmount) >
      0.01
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "The payment amount does not match the order total."
      });
    }

    const orderNumber =
      "BR-" +
      Date.now() +
      "-" +
      Math.floor(
        1000 + Math.random() * 9000
      );

    const orderResult = await client.query(
      `
      INSERT INTO orders (
        order_number,
        business_id,
        customer_name,
        customer_phone,
        customer_address,
        customer_city,
        customer_state,
        total_amount,
        status,
        payment_status,
        payment_reference
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'pending',
        'paid',
        $9
      )
      RETURNING *
      `,
      [
        orderNumber,
        businessId,
        customerName,
        customerPhone,
        customerAddress,
        customerCity,
        customerState,
        totalAmount,
        paymentReference
      ]
    );

    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await client.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          unit_price,
          quantity,
          subtotal
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          order.id,
          item.productId,
          item.productName,
          item.unitPrice,
          item.quantity,
          item.subtotal
        ]
      );

      await client.query(
        `
        UPDATE products
        SET stock = stock - $1
        WHERE id = $2
        `,
        [
          item.quantity,
          item.productId
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order: {
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        customerCity: order.customer_city,
        customerState: order.customer_state,
        totalAmount: Number(order.total_amount),
        status: order.status,
        paymentStatus: order.payment_status,
        paymentReference:
          order.payment_reference,
        createdAt: order.created_at,
        items: orderItems
      }
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error(
      "Create order error:",
      error.response?.data ||
        error.message ||
        error
    );

    res.status(500).json({
      success: false,
      message: "Unable to create order."
    });
  } finally {
    client.release();
  }
});

module.exports = router;