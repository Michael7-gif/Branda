const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in."
      });
    }

    const result = await req.app.locals.pool.query(
      `SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        b.id AS business_id,
        b.business_name,
        b.description,
        b.phone,
        b.email AS business_email,
        b.address,
        b.whatsapp,
        b.instagram,
        b.facebook,
        b.twitter,
        b.logo_url
      FROM users u
      LEFT JOIN businesses b
        ON b.user_id = u.id
      WHERE u.id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found."
      });
    }

    const data = result.rows[0];

    res.json({
      success: true,
      dashboard: {
        user: {
          id: data.user_id,
          fullName: data.full_name,
          email: data.email
        },
        business: data.business_id
          ? {
              id: data.business_id,
              businessName: data.business_name,
              description: data.description,
              phone: data.phone,
              email: data.business_email,
              address: data.address,
              whatsapp: data.whatsapp,
              instagram: data.instagram,
              facebook: data.facebook,
              twitter: data.twitter,
              logoUrl: data.logo_url
            }
          : null
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load your dashboard."
    });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in."
      });
    }

    const period = req.query.period || "30";

    const allowedPeriods = [
      "7",
      "30",
      "90",
      "year"
    ];

    if (!allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid analytics period."
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

    const businessId =
      businessResult.rows[0].id;

    let dateCondition = "";
    let salesGroup = "day";

    if (period === "7") {
      dateCondition =
        "AND o.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'";
    }

    if (period === "30") {
      dateCondition =
        "AND o.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
    }

    if (period === "90") {
      dateCondition =
        "AND o.created_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'";
    }

    if (period === "year") {
      dateCondition =
        "AND o.created_at >= DATE_TRUNC('year', CURRENT_TIMESTAMP)";
      salesGroup = "month";
    }

    const salesResult = await pool.query(
      `
      SELECT
        DATE_TRUNC(
          '${salesGroup}',
          o.created_at
        ) AS period,
        COALESCE(
          SUM(o.total_amount),
          0
        ) AS total
      FROM orders o
      WHERE o.business_id = $1
        AND o.payment_status = 'paid'
        AND o.status <> 'cancelled'
        ${dateCondition}
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [businessId]
    );

    const totalsResult = await pool.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN o.payment_status = 'paid'
                AND o.status <> 'cancelled'
              THEN o.total_amount
              ELSE 0
            END
          ),
          0
        ) AS total_sales,

        COUNT(
          DISTINCT CASE
            WHEN o.payment_status = 'paid'
              AND o.status <> 'cancelled'
            THEN o.id
          END
        ) AS total_orders,

        COUNT(
          DISTINCT CASE
            WHEN o.payment_status = 'paid'
              AND o.status <> 'cancelled'
            THEN o.customer_phone
          END
        ) AS total_customers

      FROM orders o
      WHERE o.business_id = $1
        ${dateCondition}
      `,
      [businessId]
    );

    const productsSoldResult = await pool.query(
      `
      SELECT
        COALESCE(
          SUM(oi.quantity),
          0
        ) AS products_sold
      FROM order_items oi
      INNER JOIN orders o
        ON o.id = oi.order_id
      WHERE o.business_id = $1
        AND o.payment_status = 'paid'
        AND o.status <> 'cancelled'
        ${dateCondition}
      `,
      [businessId]
    );

    const bestSellingResult = await pool.query(
      `
      SELECT
        oi.product_id AS id,
        oi.product_name AS name,
        SUM(oi.quantity) AS quantity
      FROM order_items oi
      INNER JOIN orders o
        ON o.id = oi.order_id
      WHERE o.business_id = $1
        AND o.payment_status = 'paid'
        AND o.status <> 'cancelled'
        ${dateCondition}
      GROUP BY
        oi.product_id,
        oi.product_name
      ORDER BY
        SUM(oi.quantity) DESC
      LIMIT 5
      `,
      [businessId]
    );

    const sales = salesResult.rows.map(
      (item) => ({
        label:
          salesGroup === "month"
            ? new Date(item.period).toLocaleDateString(
                "en-NG",
                {
                  month: "short"
                }
              )
            : new Date(item.period).toLocaleDateString(
                "en-NG",
                {
                  day: "numeric",
                  month: "short"
                }
              ),
        value: Number(item.total)
      })
    );

    res.json({
      success: true,
      analytics: {
        totalSales:
          Number(
            totalsResult.rows[0].total_sales
          ) || 0,

        totalOrders:
          Number(
            totalsResult.rows[0].total_orders
          ) || 0,

        totalCustomers:
          Number(
            totalsResult.rows[0].total_customers
          ) || 0,

        productsSold:
          Number(
            productsSoldResult.rows[0].products_sold
          ) || 0,

        sales,

        bestSellingProducts:
          bestSellingResult.rows.map(
            (product) => ({
              id: product.id,
              name: product.name,
              quantity:
                Number(product.quantity) || 0
            })
          )
      }
    });
  } catch (error) {
    console.error(
      "Analytics error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to load analytics."
    });
  }
});

module.exports = router;