import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/analytics.css";
import API_URL from "../services/api";
import { getMyBusiness } from "../services/businessCache";

export default function Analytics() {
  const [period, setPeriod] = useState("30");

  const [analytics, setAnalytics] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    productsSold: 0,
    sales: [],
    bestSellingProducts: []
  });

  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    loadBusiness();
  }, []);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setError("");

        const response = await fetch(
          `${API_URL}/api/dashboard/analytics?period=${period}`,
          {
            credentials: "include"
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load analytics."
          );
        }

        setAnalytics(
          data.analytics || {
            totalSales: 0,
            totalOrders: 0,
            totalCustomers: 0,
            productsSold: 0,
            sales: [],
            bestSellingProducts: []
          }
        );
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadAnalytics();
  }, [period]);

  async function loadBusiness() {
    try {
      const currentBusiness = await getMyBusiness();

      if (currentBusiness) {
        setBusiness(currentBusiness);
      }
    } catch {
      return;
    }
  }

  const maxSales = Math.max(
    ...analytics.sales.map(
      (item) => Number(item.value) || 0
    ),
    1
  );

  const businessSlug =
    business?.slug ||
    business?.business_slug ||
    "";

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <Link
          to="/dashboard"
          className="analytics-brand"
        >
          Branda
        </Link>

        <nav className="analytics-nav">
          <Link to="/dashboard">
            Home
          </Link>

          {businessSlug && (
            <Link
              to={`/store/${businessSlug}`}
            >
              View Store
            </Link>
          )}
        </nav>
      </header>

      <main className="analytics-main">
        <div className="analytics-page-header">
          <div>
            <p className="analytics-eyebrow">
              STORE PERFORMANCE
            </p>

            <h1>Analytics</h1>

            <p>
              Understand your sales, orders and
              customer activity.
            </p>
          </div>

          <select
            className="analytics-period"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value)
            }
          >
            <option value="7">
              Last 7 days
            </option>

            <option value="30">
              Last 30 days
            </option>

            <option value="90">
              Last 90 days
            </option>

            <option value="year">
              This year
            </option>
          </select>
        </div>

        {error && (
          <div className="analytics-error-message">
            {error}
          </div>
        )}

        <div className="analytics-stats">
          <div className="analytics-stat">
            <span>Total Sales</span>

            <strong>
              ₦
              {Number(
                analytics.totalSales || 0
              ).toLocaleString()}
            </strong>
          </div>

          <div className="analytics-stat">
            <span>Total Orders</span>

            <strong>
              {Number(
                analytics.totalOrders || 0
              ).toLocaleString()}
            </strong>
          </div>

          <div className="analytics-stat">
            <span>Total Customers</span>

            <strong>
              {Number(
                analytics.totalCustomers || 0
              ).toLocaleString()}
            </strong>
          </div>

          <div className="analytics-stat">
            <span>Products Sold</span>

            <strong>
              {Number(
                analytics.productsSold || 0
              ).toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="analytics-content-grid">
          <section className="analytics-card">
            <p className="analytics-label">
              PRODUCTS
            </p>

            <h2>
              Best Selling Products
            </h2>

            {analytics.bestSellingProducts
              .length > 0 ? (
              <div className="analytics-product-list">
                {analytics.bestSellingProducts.map(
                  (product) => (
                    <div
                      className="analytics-product"
                      key={
                        product.id ||
                        product.name
                      }
                    >
                      <div>
                        <strong>
                          {product.name}
                        </strong>

                        <p>
                          {Number(
                            product.quantity
                          ).toLocaleString()}{" "}
                          sold
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="analytics-empty">
                No product sales data available
                yet.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}