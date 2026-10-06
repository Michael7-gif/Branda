import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/reset-password.css";
import API_URL from "../services/api";
export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError(
        "Your new password must be at least 8 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch( `${API_URL}/api/auth/reset-password` ,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      console.log("Reset password status:", response.status);
      console.log("Reset password response:", data);

      if (!response.ok) {
        setError(
          data.message || "Unable to reset your password."
        );
        return;
      }

      setSuccess(
        "Your password has been reset successfully. Redirecting you to sign in..."
      );

      localStorage.removeItem("branda_reset_email");

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (requestError) {
      console.error(
        "Reset password error:",
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
    <div className="reset-password-page">
      <header className="reset-password-header">
        <Link to="/" className="reset-password-logo">
          Branda
        </Link>

        <p>
          Remember your password?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </header>

      <main className="reset-password-main">
        <section className="reset-password-intro">
          <p className="reset-password-label">
            CREATE NEW PASSWORD
          </p>

          <h1>Create a new password.</h1>

          <p>
            Your verification code has been confirmed. Choose
            a new password for your Branda account.
          </p>
        </section>

        <section className="reset-password-card">
          <div className="reset-password-card-heading">
            <h2>New password</h2>

            <p>
              Create a strong password for your Branda account.
            </p>
          </div>

          {error && (
            <div className="reset-password-error">
              {error}
            </div>
          )}

          {success && (
            <div className="reset-password-success">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="reset-password-form-group">
              <label htmlFor="password">
                New password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your new password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                required
              /> 

               <button
                 type="button"
                 onClick={() => setShowPassword((current) => !current)}
                 aria-label={showPassword ? "Hide password" : "Show password"}
               >
                 {showPassword ? "Hide" : "Show"}
               </button>
            </div>

            <div className="reset-password-form-group">
              <label htmlFor="confirmPassword">
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                }}
                required
              /> 

               <button
                 type="button"
                 onClick={() => setShowConfirmPassword((current) => !current)}
                 aria-label={showConfirmPassword ? "Hide password" : "Show password"}
               >
                 {showConfirmPassword ? "Hide" : "Show"}
               </button>
            </div>

            <button type="submit" disabled={loading}>
              {loading
                ? "Resetting password..."
                : "Reset password"}
            </button>
          </form>

          <p className="reset-password-info">
            Your password must be at least 8 characters long.
          </p>

          <p className="reset-password-bottom-text">
            Need a new code?{" "}
            <Link to="/forgot-password">
              Request another code
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}