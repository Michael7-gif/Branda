import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/verify-reset-code.css";

export default function VerifyResetCode() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email) {
      setError(
        "Your password reset session is invalid. Please request a new code."
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        "Please enter the 6-digit verification code."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/verify-reset-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            code,
          }),
        }
      );

      const data = await response.json();

      console.log("Verify status:", response.status);
      console.log("Verify response:", data);

      if (!response.ok) {
        setError(
          data.message ||
            "The verification code is incorrect or has expired."
        );
        return;
      }

      if (data.success === true) {
        navigate("/reset-password");
        return;
      }

      setError(
        data.message ||
          "Verification could not be completed."
      );
    } catch (requestError) {
      console.error(
        "Verify reset code error:",
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
    <div className="verify-reset-code-page">
      <header className="verify-reset-code-header">
        <Link to="/" className="verify-reset-code-logo">
          Branda
        </Link>

        <p>
          Remember your password?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </header>

      <main className="verify-reset-code-main">
        <section className="verify-reset-code-intro">
          <p className="verify-reset-code-label">
            VERIFY YOUR ACCOUNT
          </p>

          <h1>Enter your code.</h1>

          <p>
            We sent a 6-digit verification code to your email
            address. Enter it below to continue.
          </p>
        </section>

        <section className="verify-reset-code-card">
          <div className="verify-reset-code-card-heading">
            <h2>Verification code</h2>

            <p>
              Enter the 6-digit code you received in your email.
            </p>
          </div>

          {error && (
            <div className="verify-reset-code-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="verify-reset-code-form-group">
              <label htmlFor="code">
                6-digit code
              </label>

              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength="6"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(event) => {
                  const value =
                    event.target.value.replace(/\D/g, "");

                  setCode(value);
                  setError("");
                }}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>

          <p className="verify-reset-code-info">
            Your code will expire in 10 minutes.
          </p>

          <p className="verify-reset-code-bottom-text">
            Didn't receive a code?{" "}
            <Link to="/forgot-password">
              Request another code
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}