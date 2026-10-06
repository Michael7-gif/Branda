const express = require("express");
const https = require("https");

const router = express.Router();

const uploadToCloudinary = (image, uploadPreset) => {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      file: image,
      upload_preset: "branda_products",
    }).toString();

    const request = https.request(
      {
        hostname: "api.cloudinary.com",
        path: `/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          let result;

          try {
            result = JSON.parse(body);
          } catch {
            reject(new Error("Cloudinary returned an invalid response."));
            return;
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(
                result.error?.message ||
                  `Cloudinary upload failed with status ${response.statusCode}.`
              )
            );
            return;
          }

          resolve(result);
        });
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.write(data);
    request.end();
  });
};

router.post("/product-image", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Product image is required.",
      });
    }

    const result = await uploadToCloudinary(
      image,
      process.env.CLOUDINARY_UPLOAD_PRESET ||
        process.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
        "branda_products"
    );

    res.status(201).json({
      success: true,
      message: "Product image uploaded successfully.",
      image: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error("Product image upload error:", error);

    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Unable to upload product image."
          : error.message || "Unable to upload product image.",
    });
  }
});


router.post("/business-logo", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in."
      });
    }

    const { image } = req.body;

    if (
      typeof image !== "string" ||
      !/^data:image\/(png|jpe?g|webp);base64,/i.test(image)
    ) {
      return res.status(400).json({
        success: false,
        message: "A PNG, JPG or WEBP image is required."
      });
    }

    if (Buffer.byteLength(image, "utf8") > 7 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "The logo image is too large."
      });
    }

    const result = await uploadToCloudinary(
      image,
      process.env.CLOUDINARY_UPLOAD_PRESET ||
        process.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
        "branda_products"
    );

    return res.status(201).json({
      success: true,
      message: "Business logo uploaded successfully.",
      image: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error(
      "Business logo upload error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Unable to upload business logo."
          : error.message || "Unable to upload business logo."
    });
  }
});

module.exports = router;