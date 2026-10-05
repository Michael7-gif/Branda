import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [business, setBusiness] = useState(null);

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
  }, []);

  const businessName =
    business?.business_name ||
    business?.businessName ||
    "Your Store";

  const firstName =
    localStorage.getItem("branda_user_name")?.split(" ")[0] ||
    "there";

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