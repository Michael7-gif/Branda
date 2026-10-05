const express = require("express");

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

    const customersResult = await pool.query(
      `
      SELECT
        customer_phone,
        MAX(customer_name) AS customer_name,
        MAX(customer_address) AS customer_address,
        MAX(customer_city) AS customer_city,
        MAX(customer_state) AS customer_state,
        COUNT(*) AS order_count,
        COALESCE(SUM(total_amount), 0) AS total_spent,
        MAX(created_at) AS last_order_date
      FROM orders
      WHERE business_id = $1
      GROUP BY customer_phone
      ORDER BY MAX(created_at) DESC
      `,
      [businessId]
    );

    res.json({
      success: true,
      customers: customersResult.rows
    });
  } catch (error) {
    console.error("Get customers error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load customers."
    });
  }
});

router.get("/:phone/orders", async (req, res) => {
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
        o.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
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
        AND o.customer_phone = $2
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `,
      [businessId, req.params.phone]
    );

    res.json({
      success: true,
      orders: ordersResult.rows
    });
  } catch (error) {
    console.error("Get customer orders error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load customer orders."
    });
  }
});

module.exports = router;