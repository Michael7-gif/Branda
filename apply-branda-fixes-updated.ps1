$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$productsPath = Join-Path $root "src\pages\Products.jsx"
$serverPath = Join-Path $root "server\server.js"

if (!(Test-Path $productsPath)) {
    throw "Could not find $productsPath"
}

if (!(Test-Path $serverPath)) {
    throw "Could not find $serverPath"
}

Copy-Item $productsPath "$productsPath.backup" -Force
Copy-Item $serverPath "$serverPath.backup" -Force

$products = Get-Content $productsPath -Raw

$products = $products -replace '(?s)const CLOUDINARY_CLOUD_NAME =.*?const CLOUDINARY_UPLOAD_PRESET =.*?;\r?\n\r?\n', ''

$oldUpload = @'
  const uploadImage = async (file) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        "Cloudinary settings are missing. Please check your frontend .env file."
      );
    }

    const uploadFormData = new FormData();

    uploadFormData.append("file", file);
    uploadFormData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 60000);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: uploadFormData,
          signal: controller.signal
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            "Unable to upload product image."
        );
      }

      return data.secure_url;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "The image upload took too long. Please try again."
        );
      }

      if (error.message === "Failed to fetch") {
        throw new Error(
          "The image service could not be reached. Please check your internet connection and try again."
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
'@

$newUpload = @'
  const prepareImageForUpload = (file) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Please select image files only."));
        return;
      }

      const maxInputSize = 15 * 1024 * 1024;

      if (file.size > maxInputSize) {
        reject(
          new Error(
            "One of your images is too large. Please choose an image smaller than 15MB."
          )
        );
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read the selected image. Please try again."
          )
        );
      };

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => {
          reject(
            new Error(
              "Unable to process the selected image. Please choose another image."
            )
          );
        };

        image.onload = () => {
          const maxDimension = 1800;

          let width = image.naturalWidth;
          let height = image.naturalHeight;

          if (!width || !height) {
            reject(
              new Error(
                "Unable to determine the image dimensions."
              )
            );
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round(
                height * (maxDimension / width)
              );
              width = maxDimension;
            } else {
              width = Math.round(
                width * (maxDimension / height)
              );
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "Your browser could not prepare the image for upload."
              )
            );
            return;
          }

          context.drawImage(image, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    "Unable to prepare the image for upload."
                  )
                );
                return;
              }

              resolve(blob);
            },
            "image/webp",
            0.82
          );
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  };

  const blobToDataUrl = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to prepare the image for upload."
          )
        );
      };

      reader.onload = () => resolve(reader.result);

      reader.readAsDataURL(blob);
    });
  };

  const uploadImage = async (file) => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 120000);

    try {
      const preparedImage = await prepareImageForUpload(file);
      const imageData = await blobToDataUrl(preparedImage);

      const response = await fetch(
        `${API_URL}/api/upload/product-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            image: imageData
          }),
          signal: controller.signal
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        navigate("/login");
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to upload product image. Please try again."
        );
      }

      if (!data.url) {
        throw new Error(
          "The image upload completed without returning an image URL."
        );
      }

      return data.url;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "The image upload took too long. Please check your connection and try again."
        );
      }

      if (
        error instanceof TypeError &&
        /fetch/i.test(error.message)
      ) {
        throw new Error(
          "Branda could not connect to the server. Please check your internet connection and try again."
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
'@

if (!$products.Contains($oldUpload)) {
    throw "Could not find the existing uploadImage function in Products.jsx. No product file was changed."
}

$products = $products.Replace($oldUpload, $newUpload)

$oldUploadPromise = @'
      const uploadedImages = await Promise.all(
        imageFiles.map((file) => uploadImage(file))
      );
'@

$newUploadPromise = @'
      const uploadedImages = [];

      for (const file of imageFiles) {
        const uploadedImage = await uploadImage(file);
        uploadedImages.push(uploadedImage);
      }
'@

if (!$products.Contains($oldUploadPromise)) {
    throw "Could not find the product image upload block in Products.jsx."
}

$products = $products.Replace(
    $oldUploadPromise,
    $newUploadPromise
)

Set-Content $productsPath $products -Encoding UTF8

$server = Get-Content $serverPath -Raw

$oldCookie = @'
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
'@

$newCookie = @'
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
'@

if (!$server.Contains($oldCookie)) {
    throw "Could not find the session cookie configuration in server.js."
}

$server = $server.Replace($oldCookie, $newCookie)

Set-Content $serverPath $server -Encoding UTF8

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Branda mobile product fix applied" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Updated:"
Write-Host "  src\pages\Products.jsx"
Write-Host "  server\server.js"
Write-Host ""
Write-Host "Backups created:"
Write-Host "  src\pages\Products.jsx.backup"
Write-Host "  server\server.js.backup"
Write-Host ""
Write-Host "The product page now:"
Write-Host "  - uploads through the Branda backend"
Write-Host "  - compresses mobile images before upload"
Write-Host "  - uploads images one at a time"
Write-Host "  - handles expired sessions"
Write-Host "  - handles mobile network failures"
Write-Host ""
Write-Host "The production session cookie now uses SameSite=None + Secure."
Write-Host ""