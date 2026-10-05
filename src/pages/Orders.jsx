import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/orders.css";

const API_URL = "http://localhost:5000";

const orderStatuses = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
];

function getSavedOrders() {
  try {
    return JSON.parse(
      localStorage.getItem("branda_dashboard_orders") || "[]"
    );
  } catch {
    return [];
  }
}

function getSavedBusiness() {
  try {
    return JSON.parse(
      localStorage.getItem("branda_business") || "null"
    );
  } catch {
    return null;
  }
}

export default function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState(getSavedOrders);
  const [business] = useState(getSavedBusiness);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: "GET",
          credentials: "include"
        });

        const contentType =
          response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            "The Branda backend did not return a JSON response."
          );
        }

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            navigate("/login", { replace: true });
            return;
          }

          throw new Error(
            data.message || "Unable to load orders."
          );
        }

        if (!active) {
          return;
        }

        const freshOrders = Array.isArray(data.orders)
          ? data.orders
          : [];

        setOrders(freshOrders);

        localStorage.setItem(
          "branda_dashboard_orders",
          JSON.stringify(freshOrders)
        );

        setSelectedOrder((currentOrder) => {
          if (!currentOrder) {
            return null;
          }

          return (
            freshOrders.find(
              (order) => order.id === currentOrder.id
            ) || null
          );
        });

        setError("");
      } catch (requestError) {
        console.error(requestError);

        if (!active) {
          return;
        }

        if (getSavedOrders().length === 0) {
          setError(
            requestError.message ||
              "Unable to connect to Branda."
          );
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [navigate]);

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  function formatDate(date) {
    if (!date) {
      return "Date unavailable";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function getStatusClass(status) {
    return (
      "orders-status orders-status-" +
      String(status || "pending").toLowerCase()
    );
  }

  function formatStatus(status) {
    if (!status) {
      return "Pending";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  function getTotalQuantity(items) {
    if (!Array.isArray(items)) {
      return 0;
    }

    return items.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }

  async function updateOrderStatus(orderId, status) {
    try {
      setSavingStatus(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ status })
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "The Branda backend did not return a JSON response."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update order status."
        );
      }

      const updatedOrders = orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: data.order.status,
              updated_at: data.order.updated_at
            }
          : order
      );

      setOrders(updatedOrders);

      localStorage.setItem(
        "branda_dashboard_orders",
        JSON.stringify(updatedOrders)
      );

      setSelectedOrder((currentOrder) =>
        currentOrder?.id === orderId
          ? {
              ...currentOrder,
              status: data.order.status,
              updated_at: data.order.updated_at
            }
          : currentOrder
      );
    } catch (updateError) {
      console.error(updateError);

      setError(
        updateError.message ||
          "Unable to update order status."
      );
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div className="orders-page">
      <header className="orders-header">
        <Link to="/dashboard" className="orders-logo">
          Branda
        </Link>

        <nav className="orders-header-nav">
          <Link to="/dashboard">Home</Link>

          {business?.slug && (
            <Link to={`/store/${business.slug}`}>
              View Store
            </Link>
          )}
        </nav>
      </header>

      <main className="orders-main">
        <section className="orders-intro">
          <div>
            <p className="orders-label">ORDERS</p>

            <h1>Your customer orders.</h1>

            <p>
              View and manage your customer orders from one place.
            </p>
          </div>

          <div className="orders-count">
            <span>Total orders</span>
            <strong>{orders.length}</strong>
          </div>
        </section>

        {error && (
          <section className="orders-message orders-message-error">
            <p>{error}</p>
          </section>
        )}

        {orders.length === 0 && !error && (
          <section className="orders-empty">
            <p className="orders-label">NO ORDERS YET</p>

            <h2>Your customer orders will appear here.</h2>

            <p>
              Once a customer completes a successful payment,
              their order will appear on this page.
            </p>

            <Link
              to="/dashboard/products"
              className="orders-button"
            >
              Manage Products
            </Link>
          </section>
        )}

        {orders.length > 0 && (
          <section className="orders-section">
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="orders-row"
                      onClick={() =>
                        setSelectedOrder(order)
                      }
                    >
                      <td>
                        <div className="orders-order">
                          <strong>
                            {order.order_number}
                          </strong>

                          <span>
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="orders-customer">
                          <strong>
                            {order.customer_name}
                          </strong>

                          <span>
                            {order.customer_phone}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="orders-products">
                          {Array.isArray(order.items) &&
                            order.items.map((item, index) => (
                              <div
                                key={
                                  item.productId ||
                                  `${order.id}-${index}`
                                }
                                className="orders-product"
                              >
                                <strong>
                                  {item.productName}
                                </strong>

                                <span>
                                  {formatCurrency(
                                    item.unitPrice
                                  )}{" "}
                                  each
                                </span>
                              </div>
                            ))}
                        </div>
                      </td>

                      <td>
                        <div className="orders-quantity">
                          {getTotalQuantity(order.items)}
                        </div>
                      </td>

                      <td>
                        <strong className="orders-total">
                          {formatCurrency(
                            order.total_amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            order.payment_status
                          )}
                        >
                          {order.payment_status === "paid"
                            ? "Paid"
                            : "Pending"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            order.status
                          )}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="orders-mobile-list">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="orders-mobile-card"
                  onClick={() =>
                    setSelectedOrder(order)
                  }
                >
                  <div className="orders-mobile-top">
                    <div>
                      <p className="orders-label">
                        ORDER
                      </p>

                      <h2>
                        {order.order_number}
                      </h2>
                    </div>

                    <span
                      className={getStatusClass(
                        order.status
                      )}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </div>

                  <div className="orders-mobile-info">
                    <div>
                      <span>Customer</span>
                      <strong>
                        {order.customer_name}
                      </strong>
                    </div>

                    <div>
                      <span>Product</span>
                      <strong>
                        {Array.isArray(order.items)
                          ? order.items
                              .map(
                                (item) =>
                                  item.productName
                              )
                              .join(", ")
                          : "No products"}
                      </strong>
                    </div>

                    <div>
                      <span>Quantity</span>
                      <strong>
                        {getTotalQuantity(
                          order.items
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Total</span>
                      <strong>
                        {formatCurrency(
                          order.total_amount
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Payment</span>
                      <strong>
                        {order.payment_status ===
                        "paid"
                          ? "Paid"
                          : "Pending"}
                      </strong>
                    </div>

                    <div>
                      <span>Date</span>
                      <strong>
                        {formatDate(
                          order.created_at
                        )}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {selectedOrder && (
        <div
          className="orders-modal-overlay"
          onClick={() =>
            setSelectedOrder(null)
          }
        >
          <section
            className="orders-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="orders-modal-header">
              <div>
                <p className="orders-label">
                  ORDER DETAILS
                </p>

                <h2>
                  {selectedOrder.order_number}
                </h2>
              </div>

              <button
                type="button"
                className="orders-modal-close"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ×
              </button>
            </div>

            <div className="orders-detail-grid">
              <div>
                <span>Customer</span>
                <strong>
                  {selectedOrder.customer_name}
                </strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>
                  {selectedOrder.customer_phone}
                </strong>
              </div>

              <div>
                <span>Address</span>
                <strong>
                  {selectedOrder.customer_address ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>
                  {[
                    selectedOrder.customer_city,
                    selectedOrder.customer_state
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>Payment</span>
                <strong>
                  {selectedOrder.payment_status ===
                  "paid"
                    ? "Paid"
                    : "Pending"}
                </strong>
              </div>

              <div>
                <span>Payment Reference</span>
                <strong>
                  {selectedOrder.payment_reference ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>Order Date</span>
                <strong>
                  {formatDate(
                    selectedOrder.created_at
                  )}
                </strong>
              </div>

              <div>
                <span>Total</span>
                <strong>
                  {formatCurrency(
                    selectedOrder.total_amount
                  )}
                </strong>
              </div>
            </div>

            <div className="orders-modal-products">
              <p className="orders-label">
                PRODUCTS
              </p>

              {Array.isArray(selectedOrder.items) &&
                selectedOrder.items.map(
                  (item, index) => (
                    <div
                      key={
                        item.productId ||
                        `${selectedOrder.id}-${index}`
                      }
                      className="orders-detail-product"
                    >
                      <div>
                        <strong>
                          {item.productName}
                        </strong>

                        <span>
                          {formatCurrency(
                            item.unitPrice
                          )}{" "}
                          × {item.quantity}
                        </span>
                      </div>

                      <strong>
                        {formatCurrency(
                          item.subtotal
                        )}
                      </strong>
                    </div>
                  )
                )}
            </div>

            <div className="orders-status-control">
              <div className="orders-status-heading">
                <div>
                  <p className="orders-label">
                    ORDER MANAGEMENT
                  </p>

                  <h3>
                    Change order status
                  </h3>

                  <p>
                    Select the current stage of this
                    customer's order.
                  </p>
                </div>

                <span
                  className={getStatusClass(
                    selectedOrder.status
                  )}
                >
                  Current:{" "}
                  {formatStatus(
                    selectedOrder.status
                  )}
                </span>
              </div>

              <div className="orders-status-options">
                {orderStatuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    disabled={
                      savingStatus ||
                      selectedOrder.status ===
                        status.value
                    }
                    className={
                      "orders-status-option " +
                      (selectedOrder.status ===
                      status.value
                        ? "active "
                        : "") +
                      "orders-status-option-" +
                      status.value
                    }
                    onClick={() =>
                      updateOrderStatus(
                        selectedOrder.id,
                        status.value
                      )
                    }
                  >
                    <span>
                      {status.label}
                    </span>

                    {selectedOrder.status ===
                      status.value && (
                      <small>Current</small>
                    )}
                  </button>
                ))}
              </div>

              {savingStatus && (
                <p className="orders-saving">
                  Saving...
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}