import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/products.css";

const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function Products() {
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);

  const [products, setProducts] = useState(() => {
    try {
      const savedProducts = localStorage.getItem("branda_products");

      if (!savedProducts) {
        return [];
      }

      return JSON.parse(savedProducts);
    } catch {
      return [];
    }
  });

  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    discountPrice: "",
    stock: ""
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);

    const savedBusiness = localStorage.getItem("branda_business");

    if (savedBusiness) {
      try {
        setBusiness(JSON.parse(savedBusiness));
      } catch {
        setBusiness(null);
      }
    }

    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/products",
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          navigate("/login");
          return;
        }

        setError(data.message || "Unable to load products.");
        return;
      }

      const latestProducts = data.products || [];

      setProducts(latestProducts);

      localStorage.setItem(
        "branda_products",
        JSON.stringify(latestProducts)
      );
    } catch (requestError) {
      console.error(requestError);

      setProducts((currentProducts) => {
        if (currentProducts.length === 0) {
          setError(
            "Unable to connect to Branda. Make sure the backend is running."
          );
        }

        return currentProducts;
      });
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setError("");
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    const validImages = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validImages.length !== files.length) {
      setError("Please select image files only.");
      return;
    }

    const totalImages =
      existingImages.length +
      imageFiles.length +
      validImages.length;

    if (totalImages > 5) {
      setError("You can upload a maximum of 5 product images.");
      return;
    }

    const newPreviews = validImages.map((file) => ({
      file,
      url: URL.createObjectURL(file)
    }));

    setImageFiles((previous) => [
      ...previous,
      ...validImages
    ]);

    setImagePreviews((previous) => [
      ...previous,
      ...newPreviews
    ]);

    setError("");

    event.target.value = "";
  };

  const removeNewImage = (index) => {
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index].url);
    }

    setImageFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index)
    );

    setImagePreviews((previous) =>
      previous.filter((_, previewIndex) => previewIndex !== index)
    );
  };

  const removeExistingImage = (imageUrl) => {
    setExistingImages((previous) =>
      previous.filter((image) => image.imageUrl !== imageUrl)
    );

    setError("");
  };

  const resetForm = () => {
    imagePreviews.forEach((preview) => {
      URL.revokeObjectURL(preview.url);
    });

    setFormData({
      name: "",
      price: "",
      discountPrice: "",
      stock: ""
    });

    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setEditingProduct(null);
    setError("");
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    resetForm();
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
    setError("");
  };

  const openEditForm = (product) => {
    setSelectedProduct(null);
    setSelectedImage("");

    setEditingProduct(product);

    setFormData({
      name: product.name || "",
      price: product.price ?? "",
      discountPrice: product.discount_price ?? "",
      stock: product.stock ?? ""
    });

    setExistingImages(
      Array.isArray(product.images) ? product.images : []
    );

    setImageFiles([]);
    setImagePreviews([]);
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!formData.price) {
      setError("Product price is required.");
      return;
    }

    const currentImageCount =
      existingImages.length + imageFiles.length;

    if (currentImageCount === 0) {
      setError("Please keep at least one product image.");
      return;
    }

    if (currentImageCount > 5) {
      setError("You can have a maximum of 5 product images.");
      return;
    }

    setSaving(true);

    try {
      const uploadedImages = await Promise.all(
        imageFiles.map((file) => uploadImage(file))
      );

      const finalImages = [
        ...existingImages.map((image) => image.imageUrl),
        ...uploadedImages
      ];

      const endpoint = editingProduct
        ? `http://localhost:5000/api/products/${editingProduct.id}`
        : "http://localhost:5000/api/products";

      const response = await fetch(endpoint, {
        method: editingProduct ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          price: formData.price,
          discountPrice: formData.discountPrice,
          stock: formData.stock,
          images: finalImages
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          navigate("/login");
          return;
        }

        setError(
          data.message ||
            (editingProduct
              ? "Unable to update product."
              : "Unable to create product.")
        );

        return;
      }

      setProducts((previous) => {
        const updatedProducts = editingProduct
          ? previous.map((product) =>
              product.id === data.product.id
                ? data.product
                : product
            )
          : [data.product, ...previous];

        localStorage.setItem(
          "branda_products",
          JSON.stringify(updatedProducts)
        );

        return updatedProducts;
      });

      closeForm();
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError.message ||
          "Unable to connect to Branda. Make sure the backend is running."
      );
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (product) => {
    setDeleteTarget(product);
  };

  const cancelDelete = () => {
    if (deletingProductId) {
      return;
    }

    setDeleteTarget(null);
  };

  const deleteProduct = async (product) => {
    setDeletingProductId(product.id);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${product.id}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          navigate("/login");
          return;
        }

        setError(
          data.message || "Unable to delete product."
        );

        return;
      }

      setProducts((previous) => {
        const updatedProducts = previous.filter(
          (item) => item.id !== product.id
        );

        localStorage.setItem(
          "branda_products",
          JSON.stringify(updatedProducts)
        );

        return updatedProducts;
      });

      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
        setSelectedImage("");
      }

      setDeleteTarget(null);
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Unable to connect to Branda. Make sure the backend is running."
      );
    } finally {
      setDeletingProductId(null);
    }
  };

  const openProduct = (product) => {
    const firstImage =
      product.images?.[0]?.imageUrl || "";

    setSelectedProduct(product);
    setSelectedImage(firstImage);
    setError("");
  };

  const closeProduct = () => {
    setSelectedProduct(null);
    setSelectedImage("");
  };

  const formatPrice = (price) => {
    return `₦${Number(price).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const businessName =
    business?.business_name ||
    business?.businessName ||
    "Your Store";

  return (
    <div className="products-page">
      <header className="products-header">
        <Link to="/dashboard" className="products-logo">
          Branda
        </Link>

        <nav className="products-header-nav">
          <Link to="/dashboard">Home</Link>

          {business?.slug && (
            <Link to={`/store/${business.slug}`}>
              View Store
            </Link>
          )}
        </nav>
      </header>

      <main className="products-main">
        <section className="products-top">
          <div>
            <p className="products-label">
              {businessName}
            </p>

            <h1>Your products.</h1>

            <p>
              Add and manage the products that customers will
              see in your online store.
            </p>
          </div>

          <button
            className="products-add-button"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openAddForm();
              }
            }}
          >
            {showForm ? "Close" : "Add product"}
          </button>
        </section>

        {error && (
          <div className="products-error">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {showForm && (
          <section className="product-form-card">
            <div className="product-form-header">
              <div className="product-form-heading">
                <p className="products-label">
                  {editingProduct
                    ? "EDIT PRODUCT"
                    : "NEW PRODUCT"}
                </p>

                <h2>
                  {editingProduct
                    ? "Edit product"
                    : "Add a product"}
                </h2>

                <p>
                  {editingProduct
                    ? "Update the information and images for this product."
                    : "Enter the information for your new product."}
                </p>
              </div>

              <button
                type="button"
                className="product-form-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close product form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="product-form-section">
                <div className="product-form-section-heading">
                  <span></span>

                  <div>
                    <h3>Product information</h3>

                    <p>
                      Give your product a clear name and set
                      its pricing.
                    </p>
                  </div>
                </div>

                <div className="product-form-group">
                  <label htmlFor="name">
                    Product name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="product-form-row">
                  <div className="product-form-group">
                    <label htmlFor="price">
                      Price
                    </label>

                    <div className="product-input-prefix">
                      <span>₦</span>

                      <input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="product-form-group">
                    <label htmlFor="discountPrice">
                      Discount price
                      <span>Optional</span>
                    </label>

                    <div className="product-input-prefix">
                      <span>₦</span>

                      <input
                        id="discountPrice"
                        name="discountPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.discountPrice}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="product-form-group product-stock-field">
                  <label htmlFor="stock">
                    Stock
                    <span></span>
                  </label>

                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter available stock"
                    value={formData.stock}
                    onChange={handleChange}
                  />

                  <small>
                    Enter 0 if the product is currently
                    unavailable.
                  </small>
                </div>
              </div>

              <div className="product-form-section">
                <div className="product-form-section-heading">
                  <span></span>

                  <div>
                    <h3>Product images</h3>

                    <p>
                      Use clear images that show your product
                      well.
                    </p>
                  </div>
                </div>

                {editingProduct &&
                  existingImages.length > 0 && (
                    <div className="product-form-group">
                      <label>
                        Current images
                        <span>
                          {existingImages.length}/5
                        </span>
                      </label>

                      <div className="product-image-preview-area">
                        {existingImages.map(
                          (image, index) => (
                            <div
                              className="product-image-preview"
                              key={
                                image.id ||
                                image.imageUrl
                              }
                            >
                              <div className="product-image-number">
                                {index + 1}
                              </div>

                              <img
                                src={image.imageUrl}
                                alt={formData.name}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeExistingImage(
                                    image.imageUrl
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                <div className="product-form-group">
                  <label htmlFor="productImages">
                    {editingProduct
                      ? "Add new images"
                      : "Product images"}

                    <span>
                      {existingImages.length +
                        imageFiles.length}
                      /5
                    </span>
                  </label>

                  <label
                    htmlFor="productImages"
                    className="product-upload-box"
                  >
                    <span className="product-upload-icon">
                      +
                    </span>

                    <strong>
                      Add product images
                    </strong>

                    <small>
                      JPG, PNG or WEBP · Maximum 5 images
                    </small>
                  </label>

                  <input
                    id="productImages"
                    className="product-file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />
                </div>

                {imagePreviews.length > 0 && (
                  <div className="product-image-preview-area">
                    {imagePreviews.map(
                      (preview, index) => (
                        <div
                          className="product-image-preview"
                          key={preview.url}
                        >
                          <div className="product-image-number">
                            {existingImages.length +
                              index +
                              1}
                          </div>

                          <img
                            src={preview.url}
                            alt={`New product preview ${
                              index + 1
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeNewImage(index)
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="product-form-actions">
                <button
                  type="button"
                  className="product-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="product-save-button"
                  disabled={saving}
                >
                  {saving
                    ? editingProduct
                      ? "Updating product..."
                      : "Saving product..."
                    : editingProduct
                    ? "Save changes"
                    : "Save product"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="products-list-section">
          <div className="products-list-heading">
            <div>
              <p className="products-label">
                YOUR CATALOG
              </p>

              <h2>All products</h2>
            </div>

            <span>
              {products.length} product
              {products.length === 1 ? "" : "s"}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="products-empty">
              <div className="products-empty-mark">
                +
              </div>

              <h3>No products yet.</h3>

              <p>
                Add your first product to start building your
                online store.
              </p>

              <button onClick={openAddForm}>
                Add your first product
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => {
                const mainImage =
                  product.images?.[0]?.imageUrl;

                return (
                  <article
                    className="product-card"
                    key={product.id}
                    onClick={() => openProduct(product)}
                    role="button"
                    tabIndex="0"
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        openProduct(product);
                      }
                    }}
                  >
                    <div className="product-card-image">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={product.name}
                        />
                      ) : (
                        <div className="product-card-no-image">
                          No image
                        </div>
                      )}

                      {product.discount_price && (
                        <span className="product-card-discount">
                          SALE
                        </span>
                      )}
                    </div>

                    <div className="product-card-content">
                      <div className="product-card-top">
                        <div>
                          <h3>{product.name}</h3>
                        </div>

                        <span
                          className={
                            Number(product.stock) > 0
                              ? "product-stock in-stock"
                              : "product-stock out-stock"
                          }
                        >
                          {Number(product.stock) > 0
                            ? "In Stock"
                            : "Out of Stock"}
                        </span>
                      </div>

                      <div className="product-price-area">
                        {product.discount_price ? (
                          <>
                            <span className="product-old-price">
                              {formatPrice(
                                product.price
                              )}
                            </span>

                            <strong>
                              {formatPrice(
                                product.discount_price
                              )}
                            </strong>
                          </>
                        ) : (
                          <strong>
                            {formatPrice(product.price)}
                          </strong>
                        )}
                      </div>

                      <div className="product-card-bottom">
                        <span>
                          Stock: {product.stock}
                        </span>

                        {product.images?.length > 1 && (
                          <span>
                            {product.images.length} images
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {selectedProduct && (
        <div
          className="product-details-overlay"
          onClick={closeProduct}
        >
          <div
            className="product-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="product-details-close"
              onClick={closeProduct}
            >
              ×
            </button>

            <div className="product-details-image-section">
              <div className="product-details-main-image">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={selectedProduct.name}
                  />
                ) : (
                  <div className="product-details-no-image">
                    No image available
                  </div>
                )}
              </div>

              {selectedProduct.images?.length > 0 && (
                <div className="product-details-thumbnails">
                  {selectedProduct.images.map(
                    (image, index) => (
                      <button
                        type="button"
                        className={
                          selectedImage ===
                          image.imageUrl
                            ? "product-thumbnail active"
                            : "product-thumbnail"
                        }
                        key={
                          image.id ||
                          image.imageUrl
                        }
                        onClick={() =>
                          setSelectedImage(
                            image.imageUrl
                          )
                        }
                      >
                        <img
                          src={image.imageUrl}
                          alt={`${selectedProduct.name} ${
                            index + 1
                          }`}
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="product-details-content">
              <p className="products-label">
                PRODUCT DETAILS
              </p>

              <h2>{selectedProduct.name}</h2>

              <div className="product-details-price">
                {selectedProduct.discount_price ? (
                  <>
                    <span className="product-old-price">
                      {formatPrice(
                        selectedProduct.price
                      )}
                    </span>

                    <strong>
                      {formatPrice(
                        selectedProduct.discount_price
                      )}
                    </strong>
                  </>
                ) : (
                  <strong>
                    {formatPrice(
                      selectedProduct.price
                    )}
                  </strong>
                )}
              </div>

              <div className="product-details-stock">
                <span>
                  Stock: {selectedProduct.stock}
                </span>

                <span
                  className={
                    Number(selectedProduct.stock) > 0
                      ? "product-stock in-stock"
                      : "product-stock out-stock"
                  }
                >
                  {Number(selectedProduct.stock) > 0
                    ? "In Stock"
                    : "Out of Stock"}
                </span>
              </div>

              <div className="product-details-actions">
                <button
                  type="button"
                  className="product-edit-action"
                  onClick={() =>
                    openEditForm(selectedProduct)
                  }
                >
                  Edit product
                </button>

                <button
                  type="button"
                  className="product-delete-action"
                  onClick={() =>
                    requestDelete(selectedProduct)
                  }
                  disabled={
                    deletingProductId ===
                    selectedProduct.id
                  }
                >
                  Delete product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="delete-product-overlay"
          onClick={cancelDelete}
        >
          <div
            className="delete-product-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="delete-product-icon">
              !
            </div>

            <p className="products-label">
              DELETE PRODUCT
            </p>

            <h2>Delete this product?</h2>

            <p>
              You are about to permanently delete{" "}
              <strong>{deleteTarget.name}</strong>. This
              action cannot be undone.
            </p>

            <div className="delete-product-actions">
              <button
                type="button"
                className="delete-cancel-button"
                onClick={cancelDelete}
                disabled={Boolean(deletingProductId)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={() =>
                  deleteProduct(deleteTarget)
                }
                disabled={Boolean(deletingProductId)}
              >
                {deletingProductId
                  ? "Deleting..."
                  : "Yes, delete product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}