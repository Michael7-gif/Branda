import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/payments.css";

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "";

export default function Payments() {
  const [banks, setBanks] = useState([]);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [business, setBusiness] = useState(null);

  const [loadingBanks, setLoadingBanks] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const [connected, setConnected] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [payments, setPayments] = useState([]);

  const [paymentSummary, setPaymentSummary] = useState({
    totalPayments: 0,
    successfulCount: 0,
    pendingCount: 0,
    thisMonth: 0
  });

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  useEffect(() => {
    window.scrollTo(0, 0);

    loadBusiness();
    loadBanks();
    loadPaymentAccount();
    loadPaymentHistory();
  }, []);

  async function loadBusiness() {
    try {
      const response = await fetch(
        `${API_URL}/api/business/me`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.business) {
        setBusiness(data.business);
      }
    } catch {
      return;
    }
  }

  async function loadBanks() {
    try {
      setLoadingBanks(true);

      const response = await fetch(
        `${API_URL}/api/payment/banks`,
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load banks."
        );
      }

      setBanks(data.banks || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingBanks(false);
    }
  }

  async function loadPaymentAccount() {
    try {
      const response = await fetch(
        `${API_URL}/api/payment/account`,
        {
          credentials: "include"
        }
      );

      if (response.status === 404) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load payment account."
        );
      }

      const paymentAccount =
        data.paymentAccount;

      if (paymentAccount) {
        setBankCode(
          paymentAccount.payment_bank_code || ""
        );

        setBankName(
          paymentAccount.payment_bank_name || ""
        );

        setAccountNumber(
          paymentAccount.payment_account_number || ""
        );

        setAccountName(
          paymentAccount.payment_account_name || ""
        );

        setConnected(
          Boolean(
            paymentAccount.paystack_subaccount_code
          )
        );
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadPaymentHistory() {
    try {
      setLoadingHistory(true);
      setHistoryError("");

      const response = await fetch(
        `${API_URL}/api/payment/history`,
        {
          credentials: "include"
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load payment history."
        );
      }

      setPayments(data.payments || []);

      setPaymentSummary(
        data.summary || {
          totalPayments: 0,
          successfulCount: 0,
          pendingCount: 0,
          thisMonth: 0
        }
      );
    } catch (requestError) {
      setHistoryError(
        requestError.message ||
          "Unable to load payment history."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleBankChange(event) {
    const selectedCode = event.target.value;

    setBankCode(selectedCode);

    const selectedBank = banks.find(
      (bank) =>
        String(bank.code) ===
        String(selectedCode)
    );

    setBankName(
      selectedBank?.name || ""
    );

    setAccountName("");
    setMessage("");
    setError("");
  }

  function handleAccountNumberChange(event) {
    setAccountNumber(
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 10)
    );

    setAccountName("");
    setMessage("");
    setError("");
  }

  async function verifyAccount() {
    setMessage("");
    setError("");

    if (!bankCode) {
      setError("Please select your bank.");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setError(
        "Enter a valid 10-digit account number."
      );
      return;
    }

    setVerifying(true);

    try {
      const response = await fetch(
        `${API_URL}/api/payment/account/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            accountNumber,
            bankCode
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to verify bank account."
        );
      }

      setAccountName(
        data.account.accountName
      );

      setMessage(
        "Bank account verified successfully."
      );
    } catch (requestError) {
      setError(requestError.message);
      setAccountName("");
    } finally {
      setVerifying(false);
    }
  }

  async function savePaymentAccount(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!bankCode || !bankName) {
      setError("Please select your bank.");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setError(
        "Enter a valid 10-digit account number."
      );
      return;
    }

    if (!accountName) {
      setError(
        "Please verify your bank account before saving."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/payment/account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            bankName,
            bankCode,
            accountNumber,
            accountName
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to connect payment account."
        );
      }

      setConnected(true);

      setMessage(
        "Payment account connected successfully."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
      }
    ).format(Number(amount || 0));
  }

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  }

  function formatTime(date) {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleTimeString(
      "en-NG",
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );
  }

  function getPaymentStatus(payment) {
    if (payment.paymentStatus === "paid") {
      return "Successful";
    }

    if (
      payment.paymentStatus === "pending"
    ) {
      return "Pending";
    }

    return "Failed";
  }

  const filteredPayments =
    historyFilter === "all"
      ? payments
      : payments.filter((payment) => {
          const status =
            getPaymentStatus(payment);

          if (
            historyFilter === "successful"
          ) {
            return status === "Successful";
          }

          if (
            historyFilter === "pending"
          ) {
            return status === "Pending";
          }

          if (
            historyFilter === "failed"
          ) {
            return status === "Failed";
          }

          return true;
        });

  const businessSlug =
    business?.slug ||
    business?.business_slug ||
    "";

  return (
    <div className="payments-page">
      <header className="payments-header">
        <Link
          to="/dashboard"
          className="payments-brand"
        >
          Branda
        </Link>

        <nav className="payments-nav">
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

      <main className="payments-main">
        <section className="payments-intro">
          <p className="payments-eyebrow">
            STORE SETTINGS
          </p>

          <h1>Payments</h1>

          <p>
            Set where your store receives
            customer payments and keep track
            of transactions from your store.
          </p>
        </section>

        <section className="payments-account-section">
          <div className="payments-account-copy">
            <p className="payments-label">
              PAYMENT ACCOUNT
            </p>

            <h2>
              Where should your payments go?
            </h2>

            <p>
              Connect the bank account you want
              Paystack to use for your store
              settlements.
            </p>

            {connected && (
              <div className="payments-connected">
                <span className="payments-connected-dot" />

                <div>
                  <strong>
                    Payment account connected
                  </strong>

                  <span>
                    Your Paystack settlement account
                    is active.
                  </span>
                </div>
              </div>
            )}
          </div>

          <form
            className="payments-account-form"
            onSubmit={savePaymentAccount}
          >
            <div className="payments-field">
              <label htmlFor="bank">
                Bank
              </label>

              <select
                id="bank"
                value={bankCode}
                onChange={handleBankChange}
                disabled={loadingBanks}
              >
                <option value="">
                  {loadingBanks
                    ? "Loading banks..."
                    : "Select your bank"}
                </option>

                {banks.map((bank, index) => (
                  <option
                    key={`${bank.code}-${bank.name}-${index}`}
                    value={bank.code}
                  >
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="payments-field">
              <label htmlFor="accountNumber">
                Account Number
              </label>

              <div className="payments-account-row">
                <input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={
                    handleAccountNumberChange
                  }
                  placeholder="10-digit account number"
                  maxLength="10"
                />

                <button
                  type="button"
                  className="payments-verify-button"
                  onClick={verifyAccount}
                  disabled={verifying}
                >
                  {verifying
                    ? "Verifying"
                    : "Verify"}
                </button>
              </div>
            </div>

            <div className="payments-field">
              <label htmlFor="accountName">
                Account Name
              </label>

              <input
                id="accountName"
                type="text"
                value={accountName}
                readOnly
                placeholder="Verified account name"
              />
            </div>

            {message && (
              <p className="payments-message">
                {message}
              </p>
            )}

            {error && (
              <p className="payments-error">
                {error}
              </p>
            )}

            <div className="payments-actions">
              <button
                type="submit"
                className="payments-save-button"
                disabled={saving}
              >
                {saving
                  ? "Connecting"
                  : connected
                    ? "Update Payment Account"
                    : "Connect Payment Account"}
              </button>
            </div>
          </form>
        </section>

        <section className="payment-history-section">
          <div className="payment-history-header">
            <div>
              <p className="payments-label">
                TRANSACTIONS
              </p>

              <h2>Payment history</h2>

              <p>
                Payments received from customers
                through your store.
              </p>
            </div>

            <button
              type="button"
              className="payment-history-refresh"
              onClick={loadPaymentHistory}
              disabled={loadingHistory}
            >
              {loadingHistory
                ? "Refreshing"
                : "Refresh"}
            </button>
          </div>

          <div className="payment-summary">
            <div>
              <span>
                Total received
              </span>

              <strong>
                {formatCurrency(
                  paymentSummary.totalPayments
                )}
              </strong>
            </div>

            <div>
              <span>
                Successful payments
              </span>

              <strong>
                {paymentSummary.successfulCount}
              </strong>
            </div>

            <div>
              <span>
                Pending payments
              </span>

              <strong>
                {paymentSummary.pendingCount}
              </strong>
            </div>

            <div>
              <span>
                Received this month
              </span>

              <strong>
                {formatCurrency(
                  paymentSummary.thisMonth
                )}
              </strong>
            </div>
          </div>

          <div className="payment-history">
            <div className="payment-history-toolbar">
              <div className="payment-history-filters">
                <button
                  type="button"
                  className={
                    historyFilter === "all"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setHistoryFilter("all")
                  }
                >
                  All
                </button>

                <button
                  type="button"
                  className={
                    historyFilter ===
                    "successful"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setHistoryFilter(
                      "successful"
                    )
                  }
                >
                  Successful
                </button>

                <button
                  type="button"
                  className={
                    historyFilter === "pending"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setHistoryFilter("pending")
                  }
                >
                  Pending
                </button>

                <button
                  type="button"
                  className={
                    historyFilter === "failed"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setHistoryFilter("failed")
                  }
                >
                  Failed
                </button>
              </div>

              <span className="payment-history-count">
                {filteredPayments.length}{" "}
                {filteredPayments.length === 1
                  ? "payment"
                  : "payments"}
              </span>
            </div>

            {historyError && (
              <div className="payment-history-error">
                {historyError}
              </div>
            )}

            {filteredPayments.length === 0 ? (
              <div className="payment-history-empty">
                <strong>
                  No payments yet
                </strong>

                <p>
                  Payments from your customers
                  will appear here after they
                  complete an order.
                </p>
              </div>
            ) : (
              <div className="payment-history-table-wrapper">
                <table className="payment-history-table">
                  <thead>
                    <tr>
                      <th>
                        Customer
                      </th>

                      <th>
                        Amount
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Reference
                      </th>

                      <th>
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayments.map(
                      (payment) => {
                        const status =
                          getPaymentStatus(
                            payment
                          );

                        return (
                          <tr
                            key={payment.id}
                          >
                            <td>
                              <div className="payment-customer">
                                <strong>
                                  {
                                    payment.customerName
                                  }
                                </strong>

                                <span>
                                  {
                                    payment.customerPhone
                                  }
                                </span>
                              </div>
                            </td>

                            <td>
                              <strong className="payment-amount">
                                {formatCurrency(
                                  payment.amount
                                )}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`payment-status payment-status-${status.toLowerCase()}`}
                              >
                                <span />
                                {status}
                              </span>
                            </td>

                            <td>
                              <span className="payment-reference">
                                {
                                  payment.paymentReference
                                }
                              </span>
                            </td>

                            <td>
                              <div className="payment-date">
                                <strong>
                                  {formatDate(
                                    payment.createdAt
                                  )}
                                </strong>

                                <span>
                                  {formatTime(
                                    payment.createdAt
                                  )}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}