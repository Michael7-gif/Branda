const express = require("express");
const axios = require("axios");

const router = express.Router();

async function sendBusinessPaymentNotification({
  business,
  order,
  orderItems,
  subtotal,
  deliveryFee,
  orderTotal
}) {
  if (
    !process.env.BREVO_API_KEY ||
    !process.env.BREVO_SENDER_EMAIL
  ) {
    console.error(
      "Business payment notification skipped: Brevo environment variables are missing."
    );
    return;
  }

  if (!business?.email) {
    console.error(
      "Business payment notification skipped: business email is missing."
    );
    return;
  }

  const itemRows = orderItems
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">
            ${escapeHtml(item.productName)}
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">
            ${item.quantity}
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">
            ₦${formatMoney(item.unitPrice)}
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">
            ₦${formatMoney(item.subtotal)}
          </td>
        </tr>
      `
    )
    .join("");

  const textItems = orderItems
    .map(
      (item) =>
        `${item.productName} x ${item.quantity} @ ₦${formatMoney(
          item.unitPrice
        )} = ₦${formatMoney(item.subtotal)}`
    )
    .join("\n");

  const subject = `New paid order ${order.order_number} - ${business.business_name}`;

  const textContent = `
A new payment has been received for ${business.business_name}.

Order: ${order.order_number}
Payment reference: ${order.payment_reference}

CUSTOMER
Name: ${order.customer_name}
Phone: ${order.customer_phone}
Address: ${order.customer_address}
City: ${order.customer_city}
State: ${order.customer_state}

ITEMS
${textItems}

Subtotal: ₦${formatMoney(subtotal)}
Delivery fee: ₦${formatMoney(deliveryFee)}
Final total: ₦${formatMoney(orderTotal)}

Payment status: PAID
  `.trim();

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#222;">
      <h2>New paid order received</h2>

      <p>
        A customer has successfully paid for an order from
        <strong>${escapeHtml(business.business_name)}</strong>.
      </p>

      <div style="background:#f7f7f7;padding:16px;border-radius:8px;margin:20px 0;">
        <p><strong>Order:</strong> ${escapeHtml(order.order_number)}</p>
        <p><strong>Payment reference:</strong> ${escapeHtml(
          order.payment_reference
        )}</p>
        <p><strong>Payment status:</strong> PAID</p>
      </div>

      <h3>Customer information</h3>

      <p><strong>Name:</strong> ${escapeHtml(order.customer_name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</p>
      <p><strong>Address:</strong> ${escapeHtml(order.customer_address)}</p>
      <p><strong>City:</strong> ${escapeHtml(order.customer_city)}</p>
      <p><strong>State:</strong> ${escapeHtml(order.customer_state)}</p>

      <h3>Order items</h3>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">
              Product
            </th>
            <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">
              Qty
            </th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">
              Unit price
            </th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">
              Subtotal
            </th>
          </tr>
        </thead>

        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div style="margin-top:20px;">
        <p>
          <strong>Subtotal:</strong>
          ₦${formatMoney(subtotal)}
        </p>

        <p>
          <strong>Delivery fee:</strong>
          ₦${formatMoney(deliveryFee)}
        </p>

        <p style="font-size:18px;">
          <strong>Final total:</strong>
          ₦${formatMoney(orderTotal)}
        </p>
      </div>

      <p style="margin-top:30px;">
        This order has been successfully paid through Branda.
      </p>
    </div>
  `;

  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: "Branda"
      },
      to: [
        {
          email: business.email,
          name: business.business_name || "Business owner"
        }
      ],
      subject,
      textContent,
      htmlContent
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json"
      },
      timeout: 15000
    }
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
          ) FILTER (WHERE oi.id IS NOT NULL),
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
    console.error("Update order status error:", error);

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
      SELECT
        id,
        business_name,
        email,
        delivery_fee,
        free_delivery,
        free_delivery_amount
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

    const business = businessResult.rows[0];
    const businessId = business.id;

    const paymentResponse = await axios.get(
      "https://api.paystack.co/transaction/verify/" +
        encodeURIComponent(paymentReference),
      {
        headers: {
          Authorization:
            "Bearer " + process.env.PAYSTACK_SECRET_KEY
        },
        timeout: 15000
      }
    );

    const payment = paymentResponse.data.data;

    if (!payment || payment.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment has not been completed."
      });
    }

    if (
      payment.currency &&
      payment.currency !== "NGN"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment currency."
      });
    }

    if (
      payment.metadata?.slug &&
      payment.metadata.slug !== slug
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this store."
      });
    }

    await client.query("BEGIN");

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      [paymentReference]
    );

    const existingOrderResult = await client.query(
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
        o.updated_at
      FROM orders o
      WHERE o.payment_reference = $1
      LIMIT 1
      `,
      [paymentReference]
    );

    if (existingOrderResult.rows.length > 0) {
      const existingOrder =
        existingOrderResult.rows[0];

      const existingItemsResult =
        await client.query(
          `
          SELECT
            product_id,
            product_name,
            unit_price,
            quantity,
            subtotal
          FROM order_items
          WHERE order_id = $1
          ORDER BY id ASC
          `,
          [existingOrder.id]
        );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Order already exists.",
        order: {
          id: existingOrder.id,
          orderNumber:
            existingOrder.order_number,
          customerName:
            existingOrder.customer_name,
          customerPhone:
            existingOrder.customer_phone,
          customerAddress:
            existingOrder.customer_address,
          customerCity:
            existingOrder.customer_city,
          customerState:
            existingOrder.customer_state,
          totalAmount:
            Number(existingOrder.total_amount),
          status: existingOrder.status,
          paymentStatus:
            existingOrder.payment_status,
          paymentReference:
            existingOrder.payment_reference,
          createdAt:
            existingOrder.created_at,
          items:
            existingItemsResult.rows.map(
              (item) => ({
                productId: item.product_id,
                productName:
                  item.product_name,
                unitPrice:
                  Number(item.unit_price),
                quantity:
                  Number(item.quantity),
                subtotal:
                  Number(item.subtotal)
              })
            )
        }
      });
    }

    const productIds = items.map(
      (item) => Number(item.productId)
    );

    const uniqueProductIds = [
      ...new Set(productIds)
    ];

    if (
      uniqueProductIds.some(
        (id) => !Number.isInteger(id) || id <= 0
      )
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Invalid product."
      });
    }

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
        message:
          "One or more products could not be found."
      });
    }

    let subtotalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productsResult.rows.find(
        (row) =>
          Number(row.id) ===
          Number(item.productId)
      );

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
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

      const itemSubtotal =
        unitPrice * quantity;

      subtotalAmount += itemSubtotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity,
        subtotal: itemSubtotal
      });
    }

    const configuredDeliveryFee =
      Number(business.delivery_fee) || 0;

    const freeDelivery =
      business.free_delivery === true;

    const freeDeliveryAmount =
      Number(business.free_delivery_amount) || 0;

    const deliveryFee =
      freeDelivery &&
      subtotalAmount >= freeDeliveryAmount
        ? 0
        : configuredDeliveryFee;

    const orderTotal =
      subtotalAmount + deliveryFee;

    const paidAmount =
      Number(payment.amount) / 100;

    if (
      !Number.isFinite(paidAmount) ||
      Math.abs(paidAmount - orderTotal) >
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
        orderTotal,
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

    try {
      await sendBusinessPaymentNotification({
        business,
        order,
        orderItems,
        subtotal: subtotalAmount,
        deliveryFee,
        orderTotal
      });
    } catch (emailError) {
      console.error(
        "Business payment notification email failed:",
        emailError.response?.data ||
          emailError.message ||
          emailError
      );
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully.",
      order: {
        id: order.id,
        orderNumber:
          order.order_number,
        customerName:
          order.customer_name,
        customerPhone:
          order.customer_phone,
        customerAddress:
          order.customer_address,
        customerCity:
          order.customer_city,
        customerState:
          order.customer_state,
        totalAmount:
          Number(order.total_amount),
        subtotalAmount,
        deliveryFee,
        status: order.status,
        paymentStatus:
          order.payment_status,
        paymentReference:
          order.payment_reference,
        createdAt:
          order.created_at,
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