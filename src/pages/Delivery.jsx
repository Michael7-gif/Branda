import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/delivery.css";

export default function Delivery() {
  const [business, setBusiness] = useState(null);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [freeDeliveryAmount, setFreeDeliveryAmount] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("1–3 business days");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    try {
      const savedBusiness = localStorage.getItem("branda_business");

      if (savedBusiness) {
        setBusiness(JSON.parse(savedBusiness));
      }
    } catch {
      setBusiness(null);
    }

    try {
      const savedSettings = JSON.parse(
        localStorage.getItem("branda_delivery_settings") || "null"
      );

      if (savedSettings) {
        setFreeDelivery(savedSettings.freeDelivery === true);
        setDeliveryFee(savedSettings.deliveryFee || "");
        setFreeDeliveryAmount(
          savedSettings.freeDeliveryAmount || ""
        );
        setDeliveryTime(
          savedSettings.deliveryTime || "1–3 business days"
        );
      }
    } catch {
      setFreeDelivery(false);
      setDeliveryFee("");
      setFreeDeliveryAmount("");
      setDeliveryTime("1–3 business days");
    }
  }, []);

  function saveSettings() {
    localStorage.setItem(
      "branda_delivery_settings",
      JSON.stringify({
        freeDelivery,
        deliveryFee,
        freeDeliveryAmount,
        deliveryTime
      })
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  return (
    <div className="delivery-page">
      <header className="delivery-header">
        <Link to="/dashboard" className="delivery-logo">
          Branda
        </Link>

        <nav className="delivery-header-nav">
          <Link to="/dashboard">Home</Link>

          {business?.slug && (
            <Link to={`/store/${business.slug}`}>
              View Store
            </Link>
          )}
        </nav>
      </header>

      <main className="delivery-main">
        <div className="delivery-page-header">
          <div>
            <p className="delivery-eyebrow">STORE SETTINGS</p>

            <h1>Delivery</h1>

            <p>
              Set how much customers pay for delivery and how long
              their orders usually take to arrive.
            </p>
          </div>

          <button
            type="button"
            className="delivery-save-button"
            onClick={saveSettings}
          >
            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>

        <section className="delivery-card">
          <p className="delivery-label">DELIVERY FEE</p>

          <h2>Set your delivery charges</h2>

          <div className="delivery-field">
            <label htmlFor="deliveryFee">
              Standard Delivery Fee
            </label>

            <div className="delivery-input-prefix">
              <span>₦</span>

              <input
                id="deliveryFee"
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(event) =>
                  setDeliveryFee(event.target.value)
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="delivery-field">
            <label htmlFor="deliveryTime">
              Estimated Delivery Time
            </label>

            <input
              id="deliveryTime"
              type="text"
              value={deliveryTime}
              onChange={(event) =>
                setDeliveryTime(event.target.value)
              }
              placeholder="1–3 business days"
            />

            <small>
              This will be shown to customers when they place an
              order.
            </small>
          </div>

          <div className="delivery-free-setting">
            <div>
              <strong>Free Delivery</strong>

              <p>
                Offer free delivery when customers reach a minimum
                order amount.
              </p>
            </div>

            <button
              type="button"
              aria-label="Toggle free delivery"
              className={
                freeDelivery
                  ? "delivery-toggle active"
                  : "delivery-toggle"
              }
              onClick={() =>
                setFreeDelivery((value) => !value)
              }
            >
              <span />
            </button>
          </div>

          {freeDelivery && (
            <div className="delivery-field">
              <label htmlFor="freeDeliveryAmount">
                Minimum Order Amount
              </label>

              <div className="delivery-input-prefix">
                <span>₦</span>

                <input
                  id="freeDeliveryAmount"
                  type="number"
                  min="0"
                  value={freeDeliveryAmount}
                  onChange={(event) =>
                    setFreeDeliveryAmount(event.target.value)
                  }
                  placeholder="50000"
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}