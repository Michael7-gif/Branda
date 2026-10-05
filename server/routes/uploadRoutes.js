const express = require("express");
const https = require("https");

const router = express.Router();

const uploadToCloudinary = (image) => {
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

    const result = await uploadToCloudinary(image);

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
      message: error.message || "Unable to upload product image.",
    });
  }
});

module.exports = router;