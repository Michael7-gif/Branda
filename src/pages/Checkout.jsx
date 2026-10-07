import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../styles/checkout.css";
import API_URL from "../services/api";

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [cart, setCart] = useState([]);
  const [storeSlug, setStoreSlug] = useState(slug || "");
  const [processing, setProcessing] = useState(false);
  const [whatsappProcessing, setWhatsappProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);

    try {
      const savedCart = JSON.parse(
        localStorage.getItem("branda_cart") || "[]"
      );

      if (!Array.isArray(savedCart) || savedCart.length === 0) {
        navigate(slug ? `/store/${slug}/cart` : "/cart");
        return;
      }

      setCart(savedCart);

      const cartSlug =
        savedCart[0]?.businessSlug ||
        savedCart[0]?.slug ||
        "";

      const savedStoreSlug =
        localStorage.getItem("branda_current_store_slug") || "";

      const recoveredSlug =
        slug || cartSlug || savedStoreSlug;

      if (recoveredSlug) {
        setStoreSlug(recoveredSlug);

        localStorage.setItem(
          "branda_current_store_slug",
          recoveredSlug
        );

        const cachedBusiness = localStorage.getItem(
          `branda_business_${recoveredSlug}`
        );

        if (cachedBusiness) {
          try {
            const cached = JSON.parse(cachedBusiness);
            setBusiness(cached);
            applyBusinessPaymentMethod(cached);
          } catch {
            localStorage.removeItem(
              `branda_business_${recoveredSlug}`
            );
          }
        }

        loadBusiness(recoveredSlug);
      }
    } catch {
      setCart([]);
    }
  }, [slug, navigate]);

  function getAvailablePaymentMethod(value) {
    const method = String(value || "both").toLowerCase();

    if (method === "whatsapp") return "whatsapp";
    if (method === "paystack") return "paystack";
    return "paystack";
  }

  function applyBusinessPaymentMethod(storeBusiness) {
    setPaymentMethod(getAvailablePaymentMethod(storeBusiness?.payment_method));
  }

  async function loadBusiness(storeSlugValue) {
    try {
      const response = await fetch(
        `${API_URL}/api/store/${encodeURIComponent(
          storeSlugValue
        )}`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      const storeBusiness =
        data.business || data.store?.business;

      if (!storeBusiness) {
        return;
      }

      setBusiness(storeBusiness);
      applyBusinessPaymentMethod(storeBusiness);

      localStorage.setItem(
        `branda_business_${storeSlugValue}`,
        JSON.stringify(storeBusiness)
      );

      const storeProducts =
        data.products || data.store?.products || [];

      localStorage.setItem(
        `branda_products_${storeSlugValue}`,
        JSON.stringify(storeProducts)
      );
    } catch {
      return;
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  function getItemPrice(item) {
    if (
      item.discount_price !== undefined &&
      item.discount_price !== null
    ) {
      return Number(item.discount_price);
    }

    if (
      item.discountPrice !== undefined &&
      item.discountPrice !== null
    ) {
      return Number(item.discountPrice);
    }

    return Number(item.price || 0);
  }

  const subtotal = cart.reduce((sum, item) => {
    return (
      sum +
      getItemPrice(item) *
        Number(item.quantity || 1)
    );
  }, 0);

  const configuredDeliveryFee =
    Number(
      business?.delivery_fee ??
        business?.deliveryFee ??
        0
    ) || 0;

  const freeDelivery =
    business?.free_delivery === true ||
    business?.freeDelivery === true;

  const freeDeliveryAmount =
    Number(
      business?.free_delivery_amount ??
        business?.freeDeliveryAmount ??
        0
    ) || 0;

  const deliveryFee =
    freeDelivery &&
    subtotal >= freeDeliveryAmount
      ? 0
      : configuredDeliveryFee;

  const total = subtotal + deliveryFee;

  function formatPrice(price) {
    return `₦${Number(price).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function validateCustomerDetails() {
    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return false;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return false;
    }

    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return false;
    }

    if (!form.address.trim()) {
      setError("Please enter your delivery address.");
      return false;
    }

    if (!form.city.trim()) {
      setError("Please enter your city.");
      return false;
    }

    if (!form.state.trim()) {
      setError("Please enter your state.");
      return false;
    }

    if (cart.length === 0) {
      setError("Your cart is empty.");
      return false;
    }

    return true;
  }

  function getPaymentSlug() {
    return (
      storeSlug ||
      cart[0]?.businessSlug ||
      localStorage.getItem(
        "branda_current_store_slug"
      ) ||
      ""
    );
  }

  async function handlePaystackPayment() {
    setError("");

    if (!validateCustomerDetails()) {
      return;
    }

    const paymentSlug = getPaymentSlug();

    if (!paymentSlug) {
      setError(
        "This store could not be identified. Please return to the store and try again."
      );
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(
        `${API_URL}/api/payment/initialize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.email.trim(),
            slug: paymentSlug,
            customerName: form.fullName.trim(),
            customerPhone: form.phone.trim(),
            customerAddress: form.address.trim(),
            customerCity: form.city.trim(),
            customerState: form.state.trim(),
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity || 1),
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to start payment."
        );
        return;
      }

      if (!data.payment?.authorizationUrl) {
        setError(
          "Paystack did not return a payment link."
        );
        return;
      }

      localStorage.setItem(
        "branda_pending_payment",
        JSON.stringify({
          reference: data.payment.reference,
          slug: paymentSlug,
          customerName: form.fullName.trim(),
          customerEmail: form.email.trim(),
          customerPhone: form.phone.trim(),
          customerAddress: form.address.trim(),
          customerCity: form.city.trim(),
          customerState: form.state.trim(),
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity || 1),
          })),
          amount: data.payment.amount,
        })
      );

      window.location.href =
        data.payment.authorizationUrl;
    } catch {
      setError(
        "Unable to connect to the payment service. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  }

  function normalizeWhatsAppNumber(value) {
    // Remove @, spaces, brackets, dashes, plus signs,
    // letters and every other non-numeric character.
    let number = String(value || "").replace(/\D/g, "");

    // Convert Nigerian local format:
    // 08012345678 -> 2348012345678
    if (number.startsWith("0")) {
      number = `234${number.slice(1)}`;
    }

    // If the number was already entered with Nigeria's
    // country code, keep it unchanged.
    if (number.startsWith("234")) {
      return number;
    }

    return "";
  }

  function handleWhatsAppOrder() {
    setError("");

    if (!validateCustomerDetails()) {
      return;
    }

    const whatsappNumber =
      business?.whatsapp ||
      business?.whatsApp ||
      business?.whatsapp_number ||
      "";

    if (!String(whatsappNumber).trim()) {
      setError(
        "This store has not added a WhatsApp number yet. Please choose Pay Online."
      );
      return;
    }

    setWhatsappProcessing(true);

    const cleanNumber =
      normalizeWhatsAppNumber(whatsappNumber);

    if (!cleanNumber) {
      setError(
        "The store's WhatsApp number is not valid. Please choose Pay Online."
      );
      setWhatsappProcessing(false);
      return;
    }

    // Nigerian international WhatsApp numbers should
    // contain 13 digits including 234.
    if (cleanNumber.length !== 13) {
      setError(
        "The store's WhatsApp number is not valid. Please choose Pay Online."
      );
      setWhatsappProcessing(false);
      return;
    }

    const productLines = cart
      .map((item) => {
        const quantity = Number(item.quantity || 1);
        const unitPrice = getItemPrice(item);
        const itemSubtotal = unitPrice * quantity;

        return [
          `Product: ${item.name}`,
          `Quantity: ${quantity}`,
          `Unit price: ${formatPrice(unitPrice)}`,
          `Subtotal: ${formatPrice(itemSubtotal)}`,
        ].join("\n");
      })
      .join("\n\n");

    const message = [
      `Hello ${
        business?.business_name ||
        business?.businessName ||
        "Seller"
      },`,
      "",
      "I would like to place an order from your Branda store.",
      "",
      "ORDER DETAILS",
      productLines,
      "",
      `Subtotal: ${formatPrice(subtotal)}`,
      `Delivery fee: ${formatPrice(deliveryFee)}`,
      `Final total: ${formatPrice(total)}`,
      "",
      "CUSTOMER DETAILS",
      `Name: ${form.fullName.trim()}`,
      `Email: ${form.email.trim()}`,
      `Phone: ${form.phone.trim()}`,
      `Address: ${form.address.trim()}`,
      `City: ${form.city.trim()}`,
      `State: ${form.state.trim()}`,
      "",
      "Please let me know how I should complete the payment.",
    ].join("\n");

    const whatsappUrl =
      `https://wa.me/${cleanNumber}` +
      `?text=${encodeURIComponent(message)}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );

    setWhatsappProcessing(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (paymentMethod === "whatsapp") {
      handleWhatsAppOrder();
      return;
    }

    handlePaystackPayment();
  }

  const activeSlug =
    storeSlug ||
    cart[0]?.businessSlug ||
    localStorage.getItem(
      "branda_current_store_slug"
    ) ||
    "";

  const storePath = activeSlug
    ? `/store/${activeSlug}`
    : "/";

  const cartPath = activeSlug
    ? `/store/${activeSlug}/cart`
    : "/cart";

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <Link
          to={storePath}
          className="checkout-brand"
        >
          {business?.logo_url ||
          business?.logoUrl ? (
            <img
              src={
                business.logo_url ||
                business.logoUrl
              }
              alt={
                business.business_name ||
                business.businessName ||
                "Branda Store"
              }
              className="checkout-brand-logo"
            />
          ) : (
            <span className="checkout-brand-placeholder">
              {(
                business?.business_name ||
                business?.businessName ||
                "B"
              )
                .charAt(0)
                .toUpperCase()}
            </span>
          )}

          <strong>
            {business?.business_name ||
              business?.businessName ||
              "Branda Store"}
          </strong>
        </Link>

        <Link
          to={cartPath}
          className="checkout-back"
        >
          Back to cart
        </Link>
      </header>

      <main className="checkout-container">
        <div className="checkout-heading">
          <p>CHECKOUT</p>
          <h1>Complete your order.</h1>
        </div>

        {error && (
          <div className="checkout-error">
            {error}
          </div>
        )}

        <div className="checkout-layout">
          <form
            className="checkout-form"
            onSubmit={handleSubmit}
          >
            <section className="checkout-section">
              <h2>Customer information</h2>

              <div className="checkout-field">
                <label htmlFor="fullName">
                  Full name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="checkout-two-columns">
                <div className="checkout-field">
                  <label htmlFor="email">
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="phone">
                    Phone number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </section>

            <section className="checkout-section">
              <h2>Delivery information</h2>

              <div className="checkout-field">
                <label htmlFor="address">
                  Delivery address
                </label>

                <input
                  id="address"
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter your delivery address"
                />
              </div>

              <div className="checkout-two-columns">
                <div className="checkout-field">
                  <label htmlFor="city">
                    City
                  </label>

                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Enter your city"
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="state">
                    State
                  </label>

                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Enter your state"
                  />
                </div>
              </div>
            </section>

            <section className="checkout-section">
              <h2>Payment method</h2>

              <div className="checkout-payment-options">
                {(business?.payment_method || "both") !== "whatsapp" && (
                  <label
                    className={`checkout-payment-option ${
                      paymentMethod === "paystack" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paystack"
                      checked={paymentMethod === "paystack"}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    />

                    <span>
                      <strong>Pay Online</strong>
                      <small>Pay securely with Paystack.</small>
                    </span>
                  </label>
                )}

                {(business?.payment_method || "both") !== "paystack" && (
                  <label
                    className={`checkout-payment-option ${
                      paymentMethod === "whatsapp" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="whatsapp"
                      checked={paymentMethod === "whatsapp"}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    />

                    <span>
                      <strong>Order via WhatsApp</strong>
                      <small>Send your order to the seller on WhatsApp and arrange payment directly.</small>
                    </span>
                  </label>
                )}
              </div>
            </section>

            <button
              type="submit"
              className="checkout-place-order"
              disabled={
                processing ||
                whatsappProcessing
              }
            >
              {processing
                ? "Processing..."
                : whatsappProcessing
                ? "Opening WhatsApp..."
                : paymentMethod === "whatsapp"
                ? "Order via WhatsApp"
                : `Pay ${formatPrice(total)}`}
            </button>

            <p className="checkout-payment-note">
              {paymentMethod === "whatsapp"
                ? "Your order details will be sent to the seller through WhatsApp."
                : "You will be redirected to Paystack to complete your payment securely."}
            </p>
          </form>

          <aside className="checkout-summary">
            <p className="checkout-label">
              ORDER SUMMARY
            </p>

            <h2>Your order</h2>

            <div className="checkout-products">
              {cart.map((item) => (
                <div
                  className="checkout-product"
                  key={item.productId}
                >
                  <div className="checkout-product-image">
                    {item.image ||
                    item.imageUrl ? (
                      <img
                        src={
                          item.image ||
                          item.imageUrl
                        }
                        alt={item.name}
                      />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>

                  <div className="checkout-product-info">
                    <h3>{item.name}</h3>

                    <p>
                      Quantity:{" "}
                      {Number(
                        item.quantity || 1
                      )}
                    </p>
                  </div>

                  <strong>
                    {formatPrice(
                      getItemPrice(item) *
                        Number(
                          item.quantity || 1
                        )
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className="checkout-total">
              <span>Subtotal</span>

              <strong>
                {formatPrice(subtotal)}
              </strong>
            </div>

            <div className="checkout-total">
              <span>Delivery</span>

              <strong>
                {formatPrice(deliveryFee)}
              </strong>
            </div>

            <div className="checkout-total">
              <span>Total</span>

              <strong>
                {formatPrice(total)}
              </strong>
            </div>

            <Link
              to={cartPath}
              className="checkout-edit-cart"
            >
              Edit cart
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}