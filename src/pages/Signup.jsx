import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/signup.css";
import API_URL from "../services/api";
export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create your account.");
        setLoading(false);
        return;
      }

      navigate("/business-setup");
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
    <div className="signup-page">
      <header className="signup-header">
        <Link to="/" className="signup-logo">
          Branda
        </Link>

        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </header>

      <main className="signup-main">
        <section className="signup-intro">
          <p className="signup-label">CREATE YOUR ACCOUNT</p>

          <h1>Start building your online store.</h1>

          <p>
            Create your Branda account first. After that, we'll help you set
            up your business.
          </p>
        </section>

        <section className="signup-card">
          <div className="signup-card-heading">
            <h2>Create your account</h2>
            <p>Your account will be used to manage your Branda business.</p>
          </div>

          {error && <div className="signup-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="signup-form-group">
              <label htmlFor="fullName">Full name</label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="signup-form-group">
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

            <div className="signup-form-group">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                minLength="8"
                required
              />

              <small>Use at least 8 characters.</small>

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="signup-form-group">
              <label htmlFor="confirmPassword">Confirm password</label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Enter your password again"
                value={formData.confirmPassword}
                onChange={handleChange}
                minLength="8"
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="signup-bottom-text">
            By creating an account, you can continue to set up your business
            and create your online store.
          </p>
        </section>
      </main>
    </div>
  );
}