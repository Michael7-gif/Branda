import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/forgot-password.css";
import API_URL from "../services/api";
export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to send verification code."
        );
        return;
      }

      navigate(
        `/verify-reset-code?email=${encodeURIComponent(
          normalizedEmail
        )}`
      );
    } catch (requestError) {
      console.error(
        "Forgot password error:",
        requestError
      );

      setError(
        "Unable to connect to Branda. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <header className="forgot-password-header">
        <Link to="/" className="forgot-password-logo">
          Branda
        </Link>

        <p>
          Remember your password?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </header>

      <main className="forgot-password-main">
        <section className="forgot-password-intro">
          <p className="forgot-password-label">
            ACCOUNT RECOVERY
          </p>

          <h1>Forgot your password?</h1>

          <p>
            Enter the email address connected to your Branda
            account and we will send you a verification code.
          </p>
        </section>

        <section className="forgot-password-card">
          <div className="forgot-password-card-heading">
            <h2>Reset your password</h2>

            <p>
              Enter your email address to receive a 6-digit
              verification code.
            </p>
          </div>

          {error && (
            <div className="forgot-password-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="forgot-password-form-group">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading
                ? "Sending code..."
                : "Send verification code"}
            </button>
          </form>

          <p className="forgot-password-bottom-text">
            Remember your password?{" "}
            <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}