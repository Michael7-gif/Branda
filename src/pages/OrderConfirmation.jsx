import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/order-confirmation.css";
import { getPersistent } from "../services/persistence";
import { getStore } from "../services/storeCache";

export default function OrderConfirmation() {
  const { slug } = useParams();

  const [business, setBusiness] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    let cancelled = false;

    async function loadConfirmation() {
      try {
        const [savedOrder, storeData] = await Promise.all([
          getPersistent("order", null),
          slug
            ? getStore(slug).catch(() => null)
            : Promise.resolve(null)
        ]);

        if (cancelled) {
          return;
        }

        setOrder(savedOrder);

        if (storeData?.success) {
          setBusiness(
            storeData.business ||
              storeData.store?.business ||
              null
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConfirmation();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading || !order) {
    return (
      <div className="order-confirmation-page">
        <main className="order-confirmation-empty">
          <p className="order-confirmation-label">
            ORDER INFORMATION
          </p>

          <h1>{loading ? "Loading order" : "No Order Found"}</h1>

          <p>
            {loading
              ? "Getting your order confirmation..."
              : "We could not find your order information."}
          </p>

          <Link
            to={"/store/" + slug}
            className="order-confirmation-button"
          >
            Continue Shopping
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="order-confirmation-page">
      <header className="order-confirmation-header">
        <Link
          to={"/store/" + slug}
          className="order-confirmation-brand"
        >
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.business_name}
              className="order-confirmation-brand-logo"
            />
          ) : (
            <span className="order-confirmation-brand-placeholder">
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
      </header>

      <main className="order-confirmation-container">
        <section className="order-confirmation-success">
          <div className="order-confirmation-check">
            ✓
          </div>

          <p className="order-confirmation-label">
            ORDER CONFIRMED
          </p>

          <h1>Thank You!</h1>

          <p>
            Your order has been placed successfully.
          </p>

          <div className="order-confirmation-number">
            <span>Order Number</span>
            <strong>{order.orderNumber}</strong>
          </div>
        </section>

        <section className="order-confirmation-details">
          <div className="order-confirmation-customer">
            <p className="order-confirmation-label">
              CUSTOMER DETAILS
            </p>

            <h2>Delivery Information</h2>

            <div className="order-confirmation-info">
              <div>
                <span>Name</span>
                <strong>{order.customerName}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{order.customerPhone}</strong>
              </div>

              <div>
                <span>Address</span>
                <strong>
                  {order.customerAddress}
                </strong>
              </div>

              <div>
                <span>City</span>
                <strong>{order.customerCity}</strong>
              </div>

              <div>
                <span>State</span>
                <strong>{order.customerState}</strong>
              </div>
            </div>
          </div>

          <div className="order-confirmation-items">
            <p className="order-confirmation-label">
              YOUR ORDER
            </p>

            <h2>Order Summary</h2>

            <div className="order-confirmation-products">
              {order.items?.map((item) => (
                <div
                  className="order-confirmation-product"
                  key={item.productId}
                >
                  <div>
                    <h3>{item.productName}</h3>
                    <p>Qty: {item.quantity}</p>
                  </div>

                  <strong>
                    ₦
                    {Number(
                      item.subtotal
                    ).toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>

            <div className="order-confirmation-total">
              <span>Total</span>

              <strong>
                ₦
                {Number(
                  order.totalAmount
                ).toLocaleString()}
              </strong>
            </div>
          </div>
        </section>

        <div className="order-confirmation-actions">
          <Link
            to={"/store/" + slug}
            className="order-confirmation-button"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    </div>
  );
}