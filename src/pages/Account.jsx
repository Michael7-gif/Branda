import { useEffect, useState } from "react";
import "../styles/account.css";
import API_URL from "../services/api";
import { getMyBusiness, setMyBusiness } from "../services/businessCache";

export default function Account() {
  const [business, setBusiness] = useState({
    business_name: "",
    email: "",
    phone: "",
    address: "",
    description: ""
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadBusiness() {
      try {
        const currentBusiness = await getMyBusiness();

        if (!currentBusiness) {
          throw new Error("Unable to load account details.");
        }

        setBusiness({
          business_name: currentBusiness.business_name || "",
          email: currentBusiness.email || "",
          phone: currentBusiness.phone || "",
          address: currentBusiness.address || "",
          description: currentBusiness.description || "",
          slug: currentBusiness.slug || ""
        });
      } catch (requestError) {
        setError(
          requestError.message ||
            "Unable to load account details."
        );
      }
    }

    loadBusiness();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setBusiness((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswords((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function saveAccount(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/business/me`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            businessName: business.business_name,
            phone: business.phone,
            address: business.address,
            description: business.description
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save account details."
        );
      }

      if (data.business) {
        setMyBusiness(data.business);
        setBusiness(data.business);
      }

      setMessage("Account details saved successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    setPasswordSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(passwords)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to change your password."
        );
      }

      setMessage("Password changed successfully.");

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      setShowPasswordForm(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="account-page">
      <main className="account-main">
        <div className="account-page-header">
          <div>
            <p className="account-eyebrow">ACCOUNT SETTINGS</p>
            <h1>Account</h1>
            <p>
              Manage your Branda account and business information.
            </p>
          </div>
        </div>

        {error && (
          <div className="account-message account-message-error">
            {error}
          </div>
        )}

        {message && (
          <div className="account-message account-message-success">
            {message}
          </div>
        )}

        <section className="account-card">
          <p className="account-label">BUSINESS INFORMATION</p>
          <h2>Your business</h2>

          <form onSubmit={saveAccount}>
            <div className="account-field">
              <label htmlFor="business_name">
                Business Name
              </label>

              <input
                id="business_name"
                name="business_name"
                type="text"
                value={business.business_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="account-field">
              <label htmlFor="email">
                Business Email
              </label>

              <input
                id="email"
                type="email"
                value={business.email}
                disabled
              />

              <small>
                Your account email is managed separately.
              </small>
            </div>

            <div className="account-field">
              <label htmlFor="phone">
                Phone Number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={business.phone}
                onChange={handleChange}
              />
            </div>

            <div className="account-field">
              <label htmlFor="address">
                Business Address
              </label>

              <input
                id="address"
                name="address"
                type="text"
                value={business.address}
                onChange={handleChange}
              />
            </div>

            <div className="account-field">
              <label htmlFor="description">
                Business Description (Optional)
              </label>

              <textarea
                id="description"
                name="description"
                value={business.description}
                onChange={handleChange}
                rows="5"
                placeholder="Tell customers about your business (optional)"
              />
            </div>

            <div className="account-actions">
              <button
                type="submit"
                className="account-save-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="account-card">
          <p className="account-label">SECURITY</p>
          <h2>Account security</h2>

          <div className="account-security-row">
            <div>
              <strong>Password</strong>
              <p>
                Keep your Branda account secure with a strong password.
              </p>
            </div>

            <button
              type="button"
              className="account-secondary-button"
              onClick={() => {
                setShowPasswordForm((current) => !current);
                setError("");
                setMessage("");
              }}
            >
              {showPasswordForm ? "Cancel" : "Change Password"}
            </button>
          </div>

          {showPasswordForm && (
            <form
              onSubmit={changePassword}
              className="account-password-form"
            >
              <div className="account-field">
                <label htmlFor="currentPassword">
                  Current Password
                </label>

                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="account-field">
                <label htmlFor="newPassword">
                  New Password
                </label>

                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  minLength="8"
                  required
                />

                <small>
                  Your new password must be at least 8 characters.
                </small>
              </div>

              <div className="account-field">
                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  minLength="8"
                  required
                />
              </div>

              <div className="account-password-actions">
                <button
                  type="submit"
                  className="account-password-button"
                  disabled={passwordSaving}
                >
                  {passwordSaving
                    ? "Changing Password..."
                    : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}