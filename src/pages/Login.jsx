import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";
import API_URL from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Step 1: Sign in
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        setError(loginData.message || "Unable to sign in.");
        return;
      }

      // Step 2: Check whether this account has a registered business
      const businessResponse = await fetch(`${API_URL}/api/business/me`, {
        method: "GET",
        credentials: "include",
      });

      const businessData = await businessResponse.json().catch(() => ({}));

      // User is signed in but has not registered a business yet
      if (businessResponse.status === 404) {
        navigate("/business-setup", { replace: true });
        return;
      }

      // Session was not accepted
      if (businessResponse.status === 401) {
        setError(
          "Your session could not be verified. Please sign in again."
        );
        return;
      }

      // Backend returned another error
      if (!businessResponse.ok) {
        setError(
          businessData.message ||
            "Unable to verify your business. Please try again."
        );
        return;
      }

      // Business exists
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      console.error(requestError);

      setError(
        "Unable to connect to Branda. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <Link to="/" className="login-logo">
          Branda
        </Link>

        <p>
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </header>

      <main className="login-main">
        <section className="login-intro">
          <p className="login-label">WELCOME BACK</p>

          <h1>Sign in to your business.</h1>

          <p>
            Sign in to continue managing your Branda business and online
            store.
          </p>
        </section>

        <section className="login-card">
          <div className="login-card-heading">
            <h2>Sign in</h2>
            <p>Enter your account details to continue.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-form-group">
              <div className="login-password-heading">
                <label htmlFor="password">Password</label>

                <Link to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-bottom-text">
            Don't have a Branda account?{" "}
            <Link to="/signup">Create your account</Link>
          </p>
        </section>
      </main>
    </div>
  );
}