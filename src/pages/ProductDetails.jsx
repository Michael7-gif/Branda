import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/product-details.css";
import API_URL from "../services/api";

export default function ProductDetails() {
  const { slug, productId } = useParams();

  const [business, setBusiness] = useState(() => {
    const saved = localStorage.getItem("branda_business_" + slug);

    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [product, setProduct] = useState(() => {
    const saved = localStorage.getItem("branda_products_" + slug);

    if (!saved) {
      return null;
    }

    try {
      const products = JSON.parse(saved);

      if (!Array.isArray(products)) {
        return null;
      }

      return (
        products.find(
          (item) => String(item.id) === String(productId)
        ) || null
      );
    } catch {
      return null;
    }
  });

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [slug, productId]);

  useEffect(() => {
    async function loadStore() {
      try {
        const response = await fetch(
          `${API_URL}/api/store/${encodeURIComponent(slug)}`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!data.success) {
          return;
        }

        const newBusiness =
          data.business ||
          (data.store ? data.store.business : null);

        const newProducts =
          data.products ||
          (data.store ? data.store.products : []);

        if (!newBusiness) {
          return;
        }

        const safeProducts = Array.isArray(newProducts)
          ? newProducts
          : [];

        const foundProduct = safeProducts.find(
          (item) => String(item.id) === String(productId)
        );

        setBusiness(newBusiness);
        setProduct(foundProduct || null);

        localStorage.setItem(
          "branda_business_" + slug,
          JSON.stringify(newBusiness)
        );

        localStorage.setItem(
          "branda_products_" + slug,
          JSON.stringify(safeProducts)
        );
      } catch {
        return;
      }
    }

    loadStore();
  }, [slug, productId]);

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setAdded(false);
  }, [productId]);

  if (!business || !product) {
    return (
      <main className="product-details-message">
        <div className="product-details-message-inner">
          <span>PRODUCT</span>
          <h1>Product not found</h1>
          <p>
            The product you're looking for could not be found.
          </p>

          <Link to={"/store/" + slug}>
            Back to Store
          </Link>
        </div>
      </main>
    );
  }

  const images = Array.isArray(product.images)
    ? product.images
    : [];

  const imageUrls = images
    .map((image) => image.imageUrl)
    .filter(Boolean);

  const price = Number(product.price || 0);

  const discountPrice = product.discount_price
    ? Number(product.discount_price)
    : null;

  const hasDiscount =
    discountPrice && discountPrice < price;

  const currentPrice = hasDiscount
    ? discountPrice
    : price;

  const stock = Number(product.stock || 0);

  const mainImage =
    imageUrls[selectedImage] ||
    imageUrls[0] ||
    "";

  const discountPercentage = hasDiscount
    ? Math.round(
        ((price - discountPrice) / price) * 100
      )
    : 0;

  function increaseQuantity() {
    if (quantity < stock) {
      setQuantity(quantity + 1);
    }
  }

  function decreaseQuantity() {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  }

  function addToCart() {
    if (stock <= 0) {
      return;
    }

    const saved = localStorage.getItem("branda_cart");

    let cart = [];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          cart = parsed.filter(
            (item) =>
              item &&
              String(item.businessId) === String(business.id)
          );
        }
      } catch {
        cart = [];
      }
    }

    const existingIndex = cart.findIndex(
      (item) =>
        String(item.productId) === String(product.id) &&
        String(item.businessId) === String(business.id)
    );

    if (existingIndex >= 0) {
      const newQuantity =
        Number(cart[existingIndex].quantity || 0) +
        quantity;

      cart[existingIndex].quantity = Math.min(
        newQuantity,
        stock
      );
    } else {
      cart.push({
        productId: product.id,
        businessId: business.id,
        businessSlug: business.slug,
        name: product.name,
        price: currentPrice,
        image: imageUrls[0] || "",
        quantity,
        stock,
      });
    }

    localStorage.setItem(
      "branda_cart",
      JSON.stringify(cart)
    );

    window.dispatchEvent(
      new Event("branda-cart-updated")
    );

    setAdded(true);
  }

  return (
    <div className="product-details-page">
      <header className="product-details-header">
        <div className="product-details-header-inner">
          <Link
            to={"/store/" + business.slug}
            className="product-details-brand"
          >
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.business_name}
              />
            ) : (
              <span>
                {business.business_name
                  ? business.business_name
                      .charAt(0)
                      .toUpperCase()
                  : "B"}
              </span>
            )}

            <strong>
              {business.business_name}
            </strong>
          </Link>

          <Link
            to={"/store/" + business.slug}
            className="product-details-back"
          >
            Back to Store
          </Link>
        </div>
      </header>

      <main className="product-details-container">
        <div className="product-details-breadcrumb">
          <Link to={"/store/" + business.slug}>
            Store
          </Link>

          <span>/</span>

          <span>{product.name}</span>
        </div>

        <div className="product-details-content">
          <section className="product-details-gallery">
            <div className="product-details-main-image">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                />
              ) : (
                <div className="product-details-no-image">
                  <span>NO IMAGE</span>
                </div>
              )}

              {hasDiscount && (
                <div className="product-details-sale">
                  -{discountPercentage}%
                </div>
              )}
            </div>

            {imageUrls.length > 1 && (
              <div className="product-details-thumbnails">
                {imageUrls.map((image, index) => (
                  <button
                    key={image + index}
                    type="button"
                    className={
                      selectedImage === index
                        ? "product-thumbnail active"
                        : "product-thumbnail"
                    }
                    onClick={() =>
                      setSelectedImage(index)
                    }
                  >
                    <img
                      src={image}
                      alt={
                        product.name +
                        " " +
                        (index + 1)
                      }
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="product-details-info">
            <p className="product-details-eyebrow">
              {business.business_name}
            </p>

            <h1>{product.name}</h1>

            <div className="product-details-price">
              {hasDiscount ? (
                <>
                  <strong>
                    ₦{discountPrice.toLocaleString()}
                  </strong>

                  <span>
                    ₦{price.toLocaleString()}
                  </span>
                </>
              ) : (
                <strong>
                  ₦{price.toLocaleString()}
                </strong>
              )}
            </div>

            {hasDiscount && (
              <p className="product-details-save">
                You save ₦
                {(price - discountPrice).toLocaleString()}
              </p>
            )}

            <div
              className={
                stock > 0
                  ? "product-details-stock available"
                  : "product-details-stock unavailable"
              }
            >
              <span className="product-stock-dot"></span>

              {stock > 0
                ? stock + " available"
                : "Currently out of stock"}
            </div>

            {product.description && (
              <div className="product-details-description">
                <h2>Description</h2>

                <p>{product.description}</p>
              </div>
            )}

            {stock > 0 && (
              <div className="product-details-purchase">
                <div className="product-details-purchase-label">
                  Quantity
                </div>

                <div className="product-details-purchase-row">
                  <div className="product-details-quantity">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>

                    <span>{quantity}</span>

                    <button
                      type="button"
                      onClick={increaseQuantity}
                      disabled={quantity >= stock}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="product-details-add"
                    onClick={addToCart}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            )}

            {added && (
              <div className="product-details-success">
                <div>
                  <strong>
                    Added to your cart
                  </strong>

                  <span>
                    {quantity} item
                    {quantity > 1 ? "s" : ""} added
                    successfully.
                  </span>
                </div>

                <Link
                  to={
                    "/store/" +
                    business.slug +
                    "/cart"
                  }
                >
                  View Cart
                </Link>
              </div>
            )}

            <div className="product-details-meta">
              <div>
                <span>STORE</span>
                <strong>
                  {business.business_name}
                </strong>
              </div>

              <div>
                <span>AVAILABILITY</span>
                <strong>
                  {stock > 0
                    ? "In Stock"
                    : "Out of Stock"}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}