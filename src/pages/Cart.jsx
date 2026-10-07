import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/cart.css";
import { getPersistent, setPersistent } from "../services/persistence";
import { getStore } from "../services/storeCache";

export default function Cart() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {

      try {
        const savedCart = await getPersistent("cart", []);
        const safeCart = Array.isArray(savedCart)
          ? savedCart
          : [];

        const validCart = safeCart.filter(
          (item) =>
            item &&
            item.productId &&
            item.businessId &&
            (!slug ||
              String(item.businessSlug || "") === String(slug))
        );

        if (cancelled) {
          return;
        }

        setCart(validCart);

        if (!validCart.length) {
          return;
        }

        const currentSlug =
          slug ||
          validCart[0]?.businessSlug ||
          validCart[0]?.slug ||
          "";

        if (!currentSlug) {
          return;
        }

        const data = await getStore(currentSlug);

        if (cancelled) {
          return;
        }

        const newBusiness =
          data.business ||
          data.store?.business ||
          null;

        const newProducts =
          data.products ||
          data.store?.products ||
          [];

        if (newBusiness) {
          const validProductIds = new Set(
            (Array.isArray(newProducts)
              ? newProducts
              : []
            ).map((product) => String(product.id))
          );

          const cleanedCart = validCart.filter(
            (item) =>
              String(item.businessId) ===
                String(newBusiness.id) &&
              validProductIds.has(String(item.productId)) &&
              Number(item.quantity || 0) > 0
          );

          setCart(cleanedCart);
          setBusiness(newBusiness);

          if (cleanedCart.length !== validCart.length) {
            await setPersistent("cart", cleanedCart);
            window.dispatchEvent(
              new Event("branda-cart-updated")
            );
          }
        }
      } catch {
        if (!cancelled) {
          setBusiness(null);
        }
      } finally {
        if (!cancelled) {
        }
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function updateQuantity(productId, quantity) {
    const updatedCart = cart.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity: Math.max(1, quantity)
          }
        : item
    );

    setCart(updatedCart);
    await setPersistent("cart", updatedCart);
    window.dispatchEvent(new Event("branda-cart-updated"));
  }

  async function removeItem(productId) {
    const updatedCart = cart.filter(
      (item) => item.productId !== productId
    );

    setCart(updatedCart);
    await setPersistent("cart", updatedCart);
    window.dispatchEvent(new Event("branda-cart-updated"));
  }

  const currentSlug =
    slug ||
    cart[0]?.businessSlug ||
    cart[0]?.slug ||
    "";

  const total = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.quantity || 1),
    0
  );

  function goToStore() {
    if (currentSlug) {
      navigate("/store/" + currentSlug);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="cart-page">
      <header className="cart-header">
        <Link
          to={
            currentSlug
              ? "/store/" + currentSlug
              : "/"
          }
          className="cart-brand"
        >
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.business_name || "Branda Store"}
              className="cart-brand-logo"
            />
          ) : (
            <span className="cart-brand-placeholder">
              {business?.business_name
                ? business.business_name
                    .charAt(0)
                    .toUpperCase()
                : "B"}
            </span>
          )}

          <strong>
            {business?.business_name || "Branda Store"}
          </strong>
        </Link>

        <button
          type="button"
          className="cart-back"
          onClick={goToStore}
        >
          Continue Shopping
        </button>
      </header>

      <main className="cart-container">
        <div className="cart-heading">
          <p>YOUR SHOPPING BAG</p>
          <h1>Your Cart</h1>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <h2>Your cart is empty</h2>

            <p>
              Add products to your cart and they will appear here.
            </p>

            <button
              type="button"
              className="cart-shop-button"
              onClick={goToStore}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-items">
              {cart.map((item) => (
                <article
                  className="cart-item"
                  key={item.productId}
                >
                  <div className="cart-item-image">
                    {item.image ? (
                      <img
                        src={item.image}
                        loading="lazy"
                        alt={item.name || "Product"}
                      />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>

                  <div className="cart-item-details">
                    <h2>{item.name}</h2>

                    <strong>
                      ₦
                      {Number(
                        item.price || 0
                      ).toLocaleString()}
                    </strong>

                    <div className="cart-quantity">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Number(item.quantity || 1) - 1
                          )
                        }
                        disabled={
                          Number(item.quantity || 1) <= 1
                        }
                      >
                        −
                      </button>

                      <span>
                        {Number(item.quantity || 1)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Number(item.quantity || 1) + 1
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="cart-remove"
                      onClick={() =>
                        removeItem(item.productId)
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <strong className="cart-item-total">
                    ₦
                    {(
                      Number(item.price || 0) *
                      Number(item.quantity || 1)
                    ).toLocaleString()}
                  </strong>
                </article>
              ))}
            </section>

            <aside className="cart-summary">
              <p>ORDER SUMMARY</p>

              <h2>Summary</h2>

              <div className="cart-summary-row">
                <span>Items</span>
                <strong>{cart.length}</strong>
              </div>

              <div className="cart-summary-row">
                <span>Total</span>
                <strong>
                  ₦{total.toLocaleString()}
                </strong>
              </div>

              <Link
                to={
                  currentSlug
                    ? `/store/${currentSlug}/checkout`
                    : "/checkout"
                }
                className="cart-checkout-button"
              >
                Proceed to Checkout
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
