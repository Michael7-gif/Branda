const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
require("dotenv").config();

const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const productRoutes = require("./routes/productRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const orderRoutes = require("./routes/orderRoutes");
const customerRoutes = require("./routes/customerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

app.locals.pool = pool;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  })
);

app.use(express.json({ limit: "20mb" }));

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/api/store/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const businessResult = await pool.query(
      `SELECT
        id,
        business_name,
        slug,
        description,
        phone,
        email,
        address,
        whatsapp,
        instagram,
        facebook,
        twitter,
        logo_url
       FROM businesses
       WHERE slug = $1`,
      [slug]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Store not found."
      });
    }

    const business = businessResult.rows[0];

    const productsResult = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.price,
        p.discount_price,
        p.stock,
        p.status,
        p.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'imageUrl', pi.image_url,
              'sortOrder', pi.sort_order
            )
            ORDER BY pi.sort_order ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS images
      FROM products p
      LEFT JOIN product_images pi
        ON pi.product_id = p.id
      WHERE p.business_id = $1
        AND p.status = 'active'
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
      [business.id]
    );

    res.json({
      success: true,
      store: {
        business,
        products: productsResult.rows
      }
    });
  } catch (error) {
    console.error("Get store error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load store."
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Branda backend is running."
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Branda backend and database are connected.",
      databaseTime: result.rows[0].now
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed."
    });
  }
});

app.listen(PORT, () => {
  console.log("Branda backend running on port " + PORT);
});