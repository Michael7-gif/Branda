import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "../services/api";
import { clearMyBusiness, getCachedBusiness, getMyBusiness } from "../services/businessCache";
import "../styles/dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(getCachedBusiness);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    getMyBusiness()
      .then((currentBusiness) => {
        setBusiness(currentBusiness);
      })
      .catch(() => {});

    fetch(`${API_URL}/api/auth/me`, {
      credentials: "include"
    })
      .then((response) =>
        response.ok ? response.json() : null
      )
      .then((data) => {
        if (data?.user?.full_name) {
          setUserName(data.user.full_name);
        }
      })
      .catch(() => {});
  }, []);

  const businessName =
    business?.business_name ||
    business?.businessName ||
    "Your Store";

  const firstName = "there";

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Clear local dashboard state even if the request cannot reach the server.
    } finally {
      clearMyBusiness();
      navigate("/login", { replace: true });
    }
  }

  const hour = new Date().getHours();

  let greeting = "Good evening";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/dashboard" className="dashboard-brand">
          Branda
        </Link>

        <nav className="dashboard-header-nav">
          {business?.slug && (
            <Link
              to={`/store/${business.slug}`}
              className="dashboard-view-store"
            >
              View Store
            </Link>
          )}

          <button
            type="button"
            className="dashboard-logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </nav>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <p className="dashboard-store-name">
            {businessName}
          </p>

          <h1>
            {greeting}, {firstName}.
          </h1>

          <p className="dashboard-welcome-text">
            Manage your store from one place.
          </p>
        </section>

        <section className="dashboard-menu">
          <Link
            to="/dashboard/products"
            className="dashboard-menu-item"
          >
            <div>
              <h2>Products</h2>
              <p>Manage your products and inventory.</p>
            </div>
          </Link>

          <Link
            to="/dashboard/orders"
            className="dashboard-menu-item"
          >
            <div>
              <h2>Orders</h2>
              <p>View and manage customer orders.</p>
            </div>
          </Link>

          <Link
            to="/dashboard/customers"
            className="dashboard-menu-item"
          >
            <div>
              <h2>Customers</h2>
              <p>See the people buying from your store.</p>
            </div>
          </Link>

          <Link
            to="/dashboard/store"
            className="dashboard-menu-item"
          >
            <div>
              <h2>Store</h2>
              <p>Edit your store information.</p>
            </div>
          </Link>

          <Link
            to="/dashboard/delivery"
            className="dashboard-menu-item"
          >
            <div>
              <h2>Delivery</h2>
              <p>Manage delivery settings.</p>
            </div>
          </Link>

          <Link
            to="/dashboard/payments"
            className="dashboard-menu-item"
          >
            <div>
              <h2>Payments</h2>
              <p>Manage your payment account.</p>
            </div>
          </Link>

          <Link
            to="/dashboard/analytics"
            className="dashboard-menu-item"
          >
            <div>
              <h2>Analytics</h2>
              <p>Understand how your store is performing.</p>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}