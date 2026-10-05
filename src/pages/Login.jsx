import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to sign in.");
        return;
      }

      navigate("/dashboard");
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
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
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



