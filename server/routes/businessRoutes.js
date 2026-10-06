const express = require("express");

const router = express.Router();

const createSlug = (businessName) => {
  return businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const generateUniqueSlug = async (pool, businessName, businessId = null) => {
  const baseSlug = createSlug(businessName);

  if (!baseSlug) {
    throw new Error(
      "Business name must contain at least one letter or number."
    );
  }

  let slug = baseSlug;
  let slugNumber = 1;

  while (true) {
    let query = `
      SELECT id
      FROM businesses
      WHERE slug = $1
    `;

    const values = [slug];

    if (businessId) {
      query += ` AND id != $2`;
      values.push(businessId);
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return slug;
    }

    slugNumber += 1;
    slug = `${baseSlug}-${slugNumber}`;
  }
};

router.post("/", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const {
      businessName,
      description,
      phone,
      email,
      address,
      whatsapp,
      instagram,
      facebook,
      twitter,
      logoUrl,
    } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name is required.",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    if (!whatsapp || !whatsapp.trim()) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp number is required.",
      });
    }

    const existingBusiness = await req.app.locals.pool.query(
      `SELECT id
       FROM businesses
       WHERE user_id = $1`,
      [req.session.userId]
    );

    if (existingBusiness.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You already have a business.",
      });
    }

    const slug = await generateUniqueSlug(
      req.app.locals.pool,
      businessName
    );

    const result = await req.app.locals.pool.query(
      `INSERT INTO businesses (
        user_id,
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
        logo_url,
        delivery_fee,
        free_delivery,
        free_delivery_amount,
        delivery_time
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
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16
      )
      RETURNING *`,
      [
        req.session.userId,
        businessName.trim(),
        slug,
        description?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        whatsapp?.trim() || null,
        instagram?.trim() || null,
        facebook?.trim() || null,
        twitter?.trim() || null,
        logoUrl?.trim() || null,
        0,
        false,
        0,
        "1–3 business days",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Business created successfully.",
      business: result.rows[0],
    });
  } catch (error) {
    console.error("Create business error:", error);

    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Something went wrong while creating your business."
          : error.message ||
            "Something went wrong while creating your business.",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const result = await req.app.locals.pool.query(
      `SELECT *
       FROM businesses
       WHERE user_id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    res.json({
      success: true,
      business: result.rows[0],
    });
  } catch (error) {
    console.error("Get business error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve your business.",
    });
  }
});

router.put("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const {
      businessName,
      description,
      phone,
      email,
      address,
      whatsapp,
      instagram,
      facebook,
      twitter,
      logoUrl,
      deliveryFee,
      freeDelivery,
      freeDeliveryAmount,
      deliveryTime,
    } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name is required.",
      });
    }

    const businessResult = await req.app.locals.pool.query(
      `SELECT id, business_name, slug
       FROM businesses
       WHERE user_id = $1`,
      [req.session.userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    const business = businessResult.rows[0];

    let slug = business.slug;

    if (
      business.business_name.trim().toLowerCase() !==
      businessName.trim().toLowerCase()
    ) {
      slug = await generateUniqueSlug(
        req.app.locals.pool,
        businessName,
        business.id
      );
    }

    const parsedDeliveryFee = Number(deliveryFee);

    const parsedFreeDeliveryAmount = Number(freeDeliveryAmount);

    if (
      !Number.isFinite(parsedDeliveryFee) ||
      parsedDeliveryFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery fee must be a valid amount.",
      });
    }

    if (
      !Number.isFinite(parsedFreeDeliveryAmount) ||
      parsedFreeDeliveryAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Free delivery amount must be a valid amount.",
      });
    }

    const result = await req.app.locals.pool.query(
      `UPDATE businesses
       SET
        business_name = $1,
        slug = $2,
        description = $3,
        phone = $4,
        email = $5,
        address = $6,
        whatsapp = $7,
        instagram = $8,
        facebook = $9,
        twitter = $10,
        logo_url = $11,
        delivery_fee = $12,
        free_delivery = $13,
        free_delivery_amount = $14,
        delivery_time = $15
       WHERE id = $16
       RETURNING *`,
      [
        businessName.trim(),
        slug,
        description?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        whatsapp?.trim() || null,
        instagram?.trim() || null,
        facebook?.trim() || null,
        twitter?.trim() || null,
        logoUrl?.trim() || null,
        parsedDeliveryFee,
        freeDelivery === true,
        parsedFreeDeliveryAmount,
        deliveryTime?.trim() || "1–3 business days",
        business.id,
      ]
    );

    res.json({
      success: true,
      message: "Business updated successfully.",
      business: result.rows[0],
    });
  } catch (error) {
    console.error("Update business error:", error);

    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Something went wrong while updating your business."
          : error.message ||
            "Something went wrong while updating your business.",
    });
  }
});

module.exports = router;