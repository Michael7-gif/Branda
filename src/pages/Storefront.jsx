import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/storefront.css";
import API_URL from "../services/api";

export default function Storefront() {
  const { slug } = useParams();

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

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("branda_products_" + slug);

    if (!saved) {
      return [];
    }

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [cartCount, setCartCount] = useState(0);

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

        setBusiness(newBusiness);
        setProducts(safeProducts);

        const validProductIds = new Set(
          safeProducts.map((product) => String(product.id))
        );

        let savedCart = [];

        try {
          const parsedCart = JSON.parse(
            localStorage.getItem("branda_cart") || "[]"
          );

          if (Array.isArray(parsedCart)) {
            savedCart = parsedCart.filter(
              (item) =>
                item &&
                String(item.businessId) === String(newBusiness.id) &&
                validProductIds.has(String(item.productId)) &&
                Number(item.quantity || 0) > 0
            );
          }
        } catch {
          savedCart = [];
        }

        localStorage.setItem(
          "branda_cart",
          JSON.stringify(savedCart)
        );

        window.dispatchEvent(new Event("branda-cart-updated"));

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
  }, [slug]);

  useEffect(() => {
    function updateCartCount() {
      const saved = localStorage.getItem("branda_cart");

      if (!saved) {
        setCartCount(0);
        return;
      }

      try {
        const cart = JSON.parse(saved);

        if (!Array.isArray(cart)) {
          setCartCount(0);
          return;
        }

        const total = cart.reduce((sum, item) => {
          return sum + Number(item.quantity || 0);
        }, 0);

        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    }

    updateCartCount();

    window.addEventListener(
      "branda-cart-updated",
      updateCartCount
    );

    window.addEventListener(
      "storage",
      updateCartCount
    );

    return () => {
      window.removeEventListener(
        "branda-cart-updated",
        updateCartCount
      );

      window.removeEventListener(
        "storage",
        updateCartCount
      );
    };
  }, [slug]);

  if (!business) {
    return (
      <main className="storefront-message">
        <h1>Store unavailable</h1>
        <p>This store could not be found.</p>
        <Link to="/">Back to Branda</Link>
      </main>
    );
  }

  return (
    <div className="storefront">
      <header className="storefront-header">
        <div className="storefront-header-inner">
          <Link
            to={"/store/" + business.slug}
            className="storefront-brand"
          >
            {business.logo_url || business.logoUrl ? (
              <img
                src={business.logo_url || business.logoUrl}
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

            <strong>{business.business_name}</strong>
          </Link>

          <nav className="storefront-nav">
            <a href="#shop">Shop</a>

            <a href="#about">About</a>

            <a href="#contact">Contact</a>

            <Link
              to={"/store/" + business.slug + "/cart"}
              className="storefront-cart-button"
            >
              <span className="storefront-cart-label">
                Cart
              </span>

              <span className="storefront-cart-count">
                {cartCount}
              </span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="storefront-hero">
          <div className="storefront-hero-content">
            <p className="storefront-eyebrow">
              WELCOME TO {business.business_name}
            </p>

            <h1>{business.business_name}</h1>

            <p className="storefront-hero-description">
              {business.description ||
                "Discover quality products from our store and find something you love."}
            </p>

            <a
              href="#shop"
              className="storefront-primary-button"
            >
              Shop Now
            </a>
          </div>

          <div className="storefront-hero-visual">
            {business.logo_url || business.logoUrl ? (
              <img
                src={business.logo_url || business.logoUrl}
                alt={business.business_name}
              />
            ) : (
              <div className="storefront-empty-visual">
                <span>
                  {business.business_name
                    ? business.business_name
                        .charAt(0)
                        .toUpperCase()
                    : "B"}
                </span>
              </div>
            )}
          </div>
        </section>

        <section
          id="shop"
          className="storefront-products-section"
        >
          <div className="storefront-section-heading">
            <div>
              <p className="storefront-eyebrow">
                OUR COLLECTION
              </p>

              <h2>Shop Our Products</h2>
            </div>

            <p>
              Browse the latest products available from{" "}
              {business.business_name}.
            </p>
          </div>

          {products.length > 0 ? (
            <div className="storefront-product-grid">
              {products.map((product) => {
                const images = product.images || [];

                const image =
                  images.length > 0
                    ? images[0].imageUrl
                    : "";

                const price = Number(product.price || 0);

                const discountPrice =
                  product.discount_price
                    ? Number(product.discount_price)
                    : null;

                const hasDiscount =
                  discountPrice &&
                  discountPrice < price;

                const stock = Number(
                  product.stock || 0
                );

                return (
                  <article
                    className="storefront-product-card"
                    key={product.id}
                  >
                    <Link
                      to={
                        "/store/" +
                        business.slug +
                        "/product/" +
                        product.id
                      }
                      className="storefront-product-image"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                        />
                      ) : (
                        <div className="storefront-no-image">
                          No Image
                        </div>
                      )}

                      {hasDiscount && (
                        <span className="storefront-discount-badge">
                          Sale
                        </span>
                      )}
                    </Link>

                    <div className="storefront-product-info">
                      <h3>{product.name}</h3>

                      <div className="storefront-price">
                        {hasDiscount ? (
                          <>
                            <strong>
                              ₦
                              {discountPrice.toLocaleString()}
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

                      <p
                        className={
                          stock > 0
                            ? "storefront-stock available"
                            : "storefront-stock unavailable"
                        }
                      >
                        {stock > 0
                          ? stock + " available"
                          : "Out of stock"}
                      </p>

                      <Link
                        to={
                          "/store/" +
                          business.slug +
                          "/product/" +
                          product.id
                        }
                        className="storefront-view-button"
                      >
                        <span>View Product</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="storefront-empty-products">
              <h3>No products yet</h3>

              <p>
                This store has not added any products yet.
              </p>
            </div>
          )}
        </section>

        <section
          id="about"
          className="storefront-about"
        >
          <div>
            <p className="storefront-eyebrow">
              
            </p>

            <h2>
              About {business.business_name}
            </h2>
          </div>

          <p>
            {business.description ||
              "We are committed to providing quality products and a great shopping experience."}
          </p>
        </section>

        <section
          id="contact"
          className="storefront-contact"
        >
          <div className="storefront-contact-heading">
            <p className="storefront-eyebrow">
              CONTACT
            </p>

            <h2>Get In Touch</h2>
          </div>

          <div className="storefront-contact-grid">
            {business.phone && (
              <div>
                <span>PHONE</span>
                <strong>{business.phone}</strong>
              </div>
            )}

            {business.email && (
              <div>
                <span>EMAIL</span>
                <strong>{business.email}</strong>
              </div>
            )}

            {business.address && (
              <div>
                <span>ADDRESS</span>
                <strong>{business.address}</strong>
              </div>
            )}

            {business.whatsapp && (
              <div>
                <span>WHATSAPP</span>
                <strong>{business.whatsapp}</strong>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="storefront-footer">
        <div>
          <strong>{business.business_name}</strong>

          <p>
            Quality products. Simple shopping.
          </p>
        </div>

        <p>
          © {new Date().getFullYear()}{" "}
          {business.business_name}. Powered by M1ckel.
        </p>
      </footer>
    </div>
  );
}