import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import "../styles/payment-success.css";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  const [business, setBusiness] = useState(() => {
    const saved = localStorage.getItem(
      "branda_business_" + slug
    );

    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState(
    "Verifying your payment..."
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    async function loadStore() {
      if (!slug) {
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/store/" +
            encodeURIComponent(slug)
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setBusiness(data.store.business);

          localStorage.setItem(
            "branda_business_" + slug,
            JSON.stringify(data.store.business)
          );
        }
      } catch (error) {
        console.error(
          "Unable to load store:",
          error
        );
      }
    }

    loadStore();
  }, [slug]);

  useEffect(() => {
    async function verifyPayment() {
      const reference = searchParams.get("reference");

      if (!reference) {
        setStatus("failed");
        setMessage(
          "Payment reference was not found."
        );
        return;
      }

      let savedPayment = null;

      try {
        savedPayment = JSON.parse(
          localStorage.getItem(
            "branda_pending_payment"
          ) || "null"
        );
      } catch {
        savedPayment = null;
      }

      if (!savedPayment) {
        setStatus("failed");
        setMessage(
          "Payment information could not be found."
        );
        return;
      }

      try {
        const paymentResponse = await fetch(
          "http://localhost:5000/api/payment/verify/" +
            encodeURIComponent(reference)
        );

        const paymentData =
          await paymentResponse.json();

        if (
          !paymentResponse.ok ||
          !paymentData.success
        ) {
          throw new Error(
            paymentData.message ||
              "Payment verification failed."
          );
        }

        if (
          paymentData.payment.status !== "success"
        ) {
          setStatus("failed");
          setMessage(
            "Your payment was not successful."
          );
          return;
        }

        const customer =
          savedPayment.customer || {
            fullName:
              savedPayment.customerName || "",
            phone:
              savedPayment.customerPhone || "",
            address:
              savedPayment.customerAddress || "",
            city:
              savedPayment.customerCity || "",
            state:
              savedPayment.customerState || ""
          };

        const cartItems =
          savedPayment.cart ||
          savedPayment.items ||
          [];

        if (!customer.fullName) {
          throw new Error(
            "Customer information could not be found."
          );
        }

        if (!cartItems.length) {
          throw new Error(
            "Your cart information could not be found."
          );
        }

        const orderResponse = await fetch(
          "http://localhost:5000/api/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              slug:
                savedPayment.slug || slug,
              customerName:
                customer.fullName,
              customerPhone:
                customer.phone,
              customerAddress:
                customer.address,
              customerCity:
                customer.city,
              customerState:
                customer.state,
              paymentReference: reference,
              items: cartItems.map(
                (item) => ({
                  productId:
                    item.productId,
                  quantity: Number(
                    item.quantity || 1
                  )
                })
              )
            })
          }
        );

        const orderData =
          await orderResponse.json();

        if (
          !orderResponse.ok ||
          !orderData.success
        ) {
          throw new Error(
            orderData.message ||
              "Payment succeeded, but the order could not be created."
          );
        }

        localStorage.setItem(
          "branda_order",
          JSON.stringify(orderData.order)
        );

        localStorage.removeItem(
          "branda_pending_payment"
        );

        localStorage.removeItem(
          "branda_cart"
        );

        window.dispatchEvent(
          new Event("branda-cart-updated")
        );

        setStatus("success");
        setMessage(
          "Your payment was successful. Preparing your order confirmation..."
        );

        setTimeout(() => {
          navigate(
            "/store/" +
              (savedPayment.slug || slug) +
              "/order-confirmation",
            {
              replace: true
            }
          );
        }, 1000);
      } catch (error) {
        console.error(
          "Payment verification error:",
          error
        );

        setStatus("failed");
        setMessage(
          error.message ||
            "Unable to verify your payment."
        );
      }
    }

    verifyPayment();
  }, [navigate, searchParams, slug]);

  return (
    <div className="payment-success-page">
      <header className="payment-success-header">
        <div className="payment-success-brand">
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.business_name}
              className="payment-success-brand-logo"
            />
          ) : (
            <span className="payment-success-brand-placeholder">
              {business?.business_name
                ? business.business_name
                    .charAt(0)
                    .toUpperCase()
                : "B"}
            </span>
          )}

          <strong>
            {business?.business_name ||
              "Branda Store"}
          </strong>
        </div>
      </header>

      <main className="payment-success-container">
        {status === "verifying" && (
          <>
            <div className="payment-success-loader">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <p className="payment-success-label">
              PAYMENT
            </p>

            <h1>Verifying Payment</h1>

            <p>{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="payment-success-icon">
              ✓
            </div>

            <p className="payment-success-label">
              PAYMENT SUCCESSFUL
            </p>

            <h1>Payment Confirmed</h1>

            <p>{message}</p>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="payment-failed-icon">
              !
            </div>

            <p className="payment-success-label">
              PAYMENT FAILED
            </p>

            <h1>
              Payment Could Not Be Verified
            </h1>

            <p>{message}</p>

            <button
              type="button"
              className="payment-success-button"
              onClick={() =>
                navigate(
                  "/store/" +
                    slug +
                    "/checkout"
                )
              }
            >
              Return to Checkout
            </button>
          </>
        )}
      </main>
    </div>
  );
}