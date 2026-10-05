const express = require("express");

const router = express.Router();

async function getBusinessId(req) {
  if (!req.session.userId) {
    return null;
  }

  const result = await req.app.locals.pool.query(
    `SELECT id
     FROM businesses
     WHERE user_id = $1`,
    [req.session.userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].id;
}

router.get("/", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const businessId = await getBusinessId(req);

    if (!businessId) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    const result = await req.app.locals.pool.query(
      `SELECT
        p.id,
        p.business_id,
        p.name,
        p.price,
        p.discount_price,
        p.stock,
        p.status,
        p.created_at,
        p.updated_at,
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
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
      [businessId]
    );

    res.json({
      success: true,
      products: result.rows,
    });
  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve products.",
    });
  }
});

router.post("/", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "You must be signed in.",
    });
  }

  const {
    name,
    price,
    discountPrice,
    stock,
    images,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Product name is required.",
    });
  }

  if (price === undefined || price === null || price === "") {
    return res.status(400).json({
      success: false,
      message: "Product price is required.",
    });
  }

  const productPrice = Number(price);

  if (Number.isNaN(productPrice) || productPrice < 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid product price.",
    });
  }

  const productStock =
    stock === undefined || stock === "" ? 0 : Number(stock);

  if (Number.isNaN(productStock) || productStock < 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid stock quantity.",
    });
  }

  let productDiscountPrice = null;

  if (
    discountPrice !== undefined &&
    discountPrice !== null &&
    discountPrice !== ""
  ) {
    productDiscountPrice = Number(discountPrice);

    if (
      Number.isNaN(productDiscountPrice) ||
      productDiscountPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid discount price.",
      });
    }
  }

  if (
    productDiscountPrice !== null &&
    productDiscountPrice > productPrice
  ) {
    return res.status(400).json({
      success: false,
      message: "Discount price cannot be higher than the original price.",
    });
  }

  if (Array.isArray(images) && images.length > 5) {
    return res.status(400).json({
      success: false,
      message: "You can upload a maximum of 5 product images.",
    });
  }

  const client = await req.app.locals.pool.connect();

  try {
    const businessId = await getBusinessId(req);

    if (!businessId) {
      client.release();

      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    await client.query("BEGIN");

    const productResult = await client.query(
      `INSERT INTO products (
        business_id,
        name,
        price,
        discount_price,
        stock,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        businessId,
        name.trim(),
        productPrice,
        productDiscountPrice,
        productStock,
        "active",
      ]
    );

    const product = productResult.rows[0];

    if (Array.isArray(images) && images.length > 0) {
      for (let index = 0; index < images.length; index += 1) {
        const imageUrl = images[index];

        if (!imageUrl || typeof imageUrl !== "string") {
          continue;
        }

        await client.query(
          `INSERT INTO product_images (
            product_id,
            image_url,
            sort_order
          )
          VALUES ($1, $2, $3)`,
          [product.id, imageUrl, index]
        );
      }
    }

    await client.query("COMMIT");

    const imagesResult = await client.query(
      `SELECT
        id,
        image_url AS "imageUrl",
        sort_order AS "sortOrder"
       FROM product_images
       WHERE product_id = $1
       ORDER BY sort_order ASC`,
      [product.id]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product: {
        ...product,
        images: imagesResult.rows,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Create product error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while creating the product.",
    });
  } finally {
    client.release();
  }
});

router.put("/:productId", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "You must be signed in.",
    });
  }

  const { productId } = req.params;

  const {
    name,
    price,
    discountPrice,
    stock,
    images,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Product name is required.",
    });
  }

  if (price === undefined || price === null || price === "") {
    return res.status(400).json({
      success: false,
      message: "Product price is required.",
    });
  }

  const productPrice = Number(price);

  if (Number.isNaN(productPrice) || productPrice < 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid product price.",
    });
  }

  const productStock =
    stock === undefined || stock === "" ? 0 : Number(stock);

  if (Number.isNaN(productStock) || productStock < 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid stock quantity.",
    });
  }

  let productDiscountPrice = null;

  if (
    discountPrice !== undefined &&
    discountPrice !== null &&
    discountPrice !== ""
  ) {
    productDiscountPrice = Number(discountPrice);

    if (
      Number.isNaN(productDiscountPrice) ||
      productDiscountPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid discount price.",
      });
    }
  }

  if (
    productDiscountPrice !== null &&
    productDiscountPrice > productPrice
  ) {
    return res.status(400).json({
      success: false,
      message: "Discount price cannot be higher than the original price.",
    });
  }

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one product image is required.",
    });
  }

  if (images.length > 5) {
    return res.status(400).json({
      success: false,
      message: "You can upload a maximum of 5 product images.",
    });
  }

  const validImages = images.filter(
    (image) => typeof image === "string" && image.trim()
  );

  if (validImages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one valid product image is required.",
    });
  }

  const client = await req.app.locals.pool.connect();

  try {
    const businessResult = await client.query(
      `SELECT id
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

    const businessId = businessResult.rows[0].id;

    const existingProductResult = await client.query(
      `SELECT id
       FROM products
       WHERE id = $1
         AND business_id = $2`,
      [productId, businessId]
    );

    if (existingProductResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    await client.query("BEGIN");

    const productResult = await client.query(
      `UPDATE products
       SET
        name = $1,
        price = $2,
        discount_price = $3,
        stock = $4,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
         AND business_id = $6
       RETURNING *`,
      [
        name.trim(),
        productPrice,
        productDiscountPrice,
        productStock,
        productId,
        businessId,
      ]
    );

    await client.query(
      `DELETE FROM product_images
       WHERE product_id = $1`,
      [productId]
    );

    for (let index = 0; index < validImages.length; index += 1) {
      await client.query(
        `INSERT INTO product_images (
          product_id,
          image_url,
          sort_order
        )
        VALUES ($1, $2, $3)`,
        [productId, validImages[index].trim(), index]
      );
    }

    await client.query("COMMIT");

    const imagesResult = await client.query(
      `SELECT
        id,
        image_url AS "imageUrl",
        sort_order AS "sortOrder"
       FROM product_images
       WHERE product_id = $1
       ORDER BY sort_order ASC`,
      [productId]
    );

    res.json({
      success: true,
      message: "Product updated successfully.",
      product: {
        ...productResult.rows[0],
        images: imagesResult.rows,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Update product error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while updating the product.",
    });
  } finally {
    client.release();
  }
});

router.delete("/:productId", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "You must be signed in.",
    });
  }

  const { productId } = req.params;

  const client = await req.app.locals.pool.connect();

  try {
    const businessResult = await client.query(
      `SELECT id
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

    const businessId = businessResult.rows[0].id;

    const productResult = await client.query(
      `SELECT id
       FROM products
       WHERE id = $1
         AND business_id = $2`,
      [productId, businessId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    await client.query("BEGIN");

    await client.query(
      `DELETE FROM product_images
       WHERE product_id = $1`,
      [productId]
    );

    await client.query(
      `DELETE FROM products
       WHERE id = $1
         AND business_id = $2`,
      [productId, businessId]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Delete product error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the product.",
    });
  } finally {
    client.release();
  }
});

module.exports = router;