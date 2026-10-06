import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/customers.css";
import API_URL from "../services/api";

function formatMoney(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatDate(value) {
  if (!value) return "No order yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No order yet";
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getStatusClass(status) {
  return String(status || "pending")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export default function Customers() {
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);

  const [customers, setCustomers] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("branda_dashboard_customers") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
  }, []);

  async function loadCustomers(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    }

    try {
      setError("");

      const response = await fetch(`${API_URL}/api/customers`, {
        credentials: "include"
      });

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load customers.");
      }

      const customerList = Array.isArray(data.customers)
        ? data.customers
        : [];

      setCustomers(customerList);

      localStorage.setItem(
        "branda_dashboard_customers",
        JSON.stringify(customerList)
      );
    } catch (err) {
      setError(err.message || "Unable to load customers.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCustomers(false);
  }, []);

  async function openCustomer(customer) {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setOrdersError("");
    setOrdersLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/customers/${encodeURIComponent(
          customer.customer_phone
        )}/orders`,
        {
          credentials: "include"
        }
      );

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load customer orders.");
      }

      setCustomerOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setOrdersError(
        err.message || "Unable to load this customer's order history."
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  function closeCustomer() {
    setSelectedCustomer(null);
    setCustomerOrders([]);
    setOrdersError("");
  }

  const totalCustomers = customers.length;

  const totalOrders = customers.reduce(
    (total, customer) => total + Number(customer.order_count || 0),
    0
  );

  const totalRevenue = customers.reduce(
    (total, customer) => total + Number(customer.total_spent || 0),
    0
  );

  return (
    <main className="customers-page">
      <header className="customers-header-bar">
        <Link to="/dashboard" className="customers-logo">
          Branda
        </Link>

        <nav className="customers-header-nav">
          <Link to="/dashboard">Home</Link>

          {business?.slug && (
            <Link to={`/store/${business.slug}`}>
              View Store
            </Link>
          )}
        </nav>
      </header>

      <div className="customers-main">
        <header className="customers-header">
          <div>
            <p className="customers-eyebrow">CUSTOMER MANAGEMENT</p>

            <h1>Customers</h1>

            <span>
              See the people who buy from your store and keep track of
              their orders.
            </span>
          </div>

          <button
            className="customers-refresh-button"
            onClick={() => loadCustomers(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </header>

        <section className="customers-summary">
          <article className="customers-summary-card">
            <p>Total Customers</p>
            <h2>{totalCustomers}</h2>
          </article>

          <article className="customers-summary-card">
            <p>Total Orders</p>
            <h2>{totalOrders}</h2>
          </article>

          <article className="customers-summary-card">
            <p>Total Customer Spending</p>
            <h2>{formatMoney(totalRevenue)}</h2>
          </article>
        </section>

        {error && (
          <div className="customers-error">
            {error}
          </div>
        )}

        <section className="customers-section">
          <div className="customers-section-header">
            <div>
              <p>CUSTOMER LIST</p>
              <h2>Your Customers</h2>
            </div>

            <span>
              {totalCustomers}{" "}
              {totalCustomers === 1 ? "customer" : "customers"}
            </span>
          </div>

          {customers.length === 0 ? (
            <div className="customers-empty">
              <h3>No customers yet</h3>

              <p>
                Customers will appear here after they place orders from
                your store.
              </p>
            </div>
          ) : (
            <div className="customers-table-wrapper">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Location</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer, index) => (
                    <tr
                      key={
                        customer.customer_phone ||
                        `${customer.customer_name}-${index}`
                      }
                    >
                      <td>
                        <div className="customer-name">
                          {customer.customer_name || "Customer"}
                        </div>
                      </td>

                      <td>
                        <span className="customer-phone">
                          {customer.customer_phone || "—"}
                        </span>
                      </td>

                      <td>
                        <span className="customer-location">
                          {customer.customer_city || "—"}
                          {customer.customer_state
                            ? `, ${customer.customer_state}`
                            : ""}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {customer.order_count || 0}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {formatMoney(customer.total_spent)}
                        </strong>
                      </td>

                      <td>
                        {formatDate(customer.last_order_date)}
                      </td>

                      <td>
                        <button
                          className="customers-view-button"
                          onClick={() => openCustomer(customer)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedCustomer && (
        <div
          className="customer-modal-overlay"
          onClick={closeCustomer}
        >
          <div
            className="customer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-modal-header">
              <div>
                <p>CUSTOMER DETAILS</p>

                <h2>
                  {selectedCustomer.customer_name || "Customer"}
                </h2>
              </div>

              <button
                className="customer-modal-close"
                onClick={closeCustomer}
              >
                Close
              </button>
            </div>

            <div className="customer-modal-body">
              <section className="customer-information">
                <div>
                  <p>Phone</p>
                  <strong>
                    {selectedCustomer.customer_phone || "—"}
                  </strong>
                </div>

                <div>
                  <p>Location</p>
                  <strong>
                    {selectedCustomer.customer_city || "—"}
                    {selectedCustomer.customer_state
                      ? `, ${selectedCustomer.customer_state}`
                      : ""}
                  </strong>
                </div>

                <div>
                  <p>Address</p>
                  <strong>
                    {selectedCustomer.customer_address || "—"}
                  </strong>
                </div>

                <div>
                  <p>Total Orders</p>
                  <strong>
                    {selectedCustomer.order_count || 0}
                  </strong>
                </div>

                <div>
                  <p>Total Spent</p>
                  <strong>
                    {formatMoney(selectedCustomer.total_spent)}
                  </strong>
                </div>

                <div>
                  <p>Last Order</p>
                  <strong>
                    {formatDate(selectedCustomer.last_order_date)}
                  </strong>
                </div>
              </section>

              <section className="customer-orders-section">
                <div className="customer-orders-heading">
                  <p>ORDER HISTORY</p>
                  <h3>Previous Orders</h3>
                </div>

                {ordersLoading ? (
                  <div className="customer-orders-empty">
                    Getting order history
                  </div>
                ) : ordersError ? (
                  <div className="customer-orders-error">
                    {ordersError}
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="customer-orders-empty">
                    No orders found for this customer.
                  </div>
                ) : (
                  <div className="customer-orders-list">
                    {customerOrders.map((order) => (
                      <article
                        className="customer-order-card"
                        key={order.id}
                      >
                        <div className="customer-order-top">
                          <div>
                            <p>ORDER</p>
                            <h4>
                              {order.order_number || "Order"}
                            </h4>
                          </div>

                          <span
                            className={`customer-order-status ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {order.status || "pending"}
                          </span>
                        </div>

                        <div className="customer-order-meta">
                          <div>
                            <p>Date</p>
                            <strong>
                              {formatDate(order.created_at)}
                            </strong>
                          </div>

                          <div>
                            <p>Payment</p>
                            <strong>
                              {order.payment_status || "pending"}
                            </strong>
                          </div>

                          <div>
                            <p>Total</p>
                            <strong>
                              {formatMoney(order.total_amount)}
                            </strong>
                          </div>
                        </div>

                        <div className="customer-order-products">
                          <p>Products</p>

                          {Array.isArray(order.items) &&
                          order.items.length > 0 ? (
                            <div className="customer-order-items">
                              {order.items.map((item, index) => (
                                <div
                                  className="customer-order-item"
                                  key={`${order.id}-${index}`}
                                >
                                  <span>
                                    {item.productName ||
                                      item.product_name ||
                                      "Product"}
                                  </span>

                                  <strong>
                                    {item.quantity || 0} ×{" "}
                                    {formatMoney(
                                      item.unitPrice ||
                                        item.unit_price
                                    )}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>
                              No product details available.
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}