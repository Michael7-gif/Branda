import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/business-setup.css";
import API_URL from "../services/api";

export default function BusinessSetup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    businessName: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    twitter: "",
    tiktok: "",
    logoUrl: "",
  });

  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingLogo(true);
      setError("");

      const reader = new FileReader();

      const image = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(
            new Error("Unable to read the selected image.")
          );
        reader.readAsDataURL(file);
      });

      const response = await fetch(
        `${API_URL}/api/upload/business-logo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ image }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.image?.url) {
        throw new Error(
          data.message || "Unable to upload your business logo."
        );
      }

      setLogoPreview(data.image.url);

      setForm((current) => ({
        ...current,
        logoUrl: data.image.url,
      }));
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to upload your business logo."
      );

      setLogoPreview("");

      setForm((current) => ({
        ...current,
        logoUrl: "",
      }));
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!form.businessName.trim()) {
      setError("Please enter your business name.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!form.whatsapp.trim()) {
      setError("Please enter your WhatsApp number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/business`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create your business."
        );
      }

      if (data.business) {
        localStorage.setItem(
          "branda_business",
          JSON.stringify(data.business)
        );
      }

      navigate("/dashboard");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to create your business."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="business-setup-page">
      <div className="business-setup-container">
        <header className="business-setup-header">
          <div className="business-setup-brand">
            <span>Branda</span>
          </div>

          <div className="business-setup-header-right">
            <div className="business-setup-progress">
              <span>Business setup</span>
            </div>
          </div>
        </header>

        <main className="business-setup-content">
          <div className="business-setup-intro">
            <span className="business-setup-eyebrow">
              GET STARTED
            </span>

            <h1>Tell us about your business.</h1>

            <p>
              Add the basic information customers will see
              when they visit your online store.
            </p>
          </div>

          <form
            className="business-setup-form"
            onSubmit={handleSubmit}
          >
            <section className="business-setup-section">
              <div className="business-setup-section-heading">
                <div>
                  <div>
                    <h2>Business information</h2>

                    <p>
                      You can update these details later
                      from your business account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="business-setup-fields">
                <div className="business-setup-field business-setup-field-full">
                  <label htmlFor="businessName">
                    Business name
                    <span className="required-label">
                      Required
                    </span>
                  </label>

                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    value={form.businessName}
                    onChange={handleChange}
                    placeholder="Enter your business name"
                    required
                  />
                </div>

                <div className="business-setup-field business-setup-field-full">
                  <label htmlFor="description">
                    Business description
                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder=""
                    rows="5"
                  />
                </div>

                <div className="business-setup-field">
                  <label htmlFor="phone">
                    Phone number
                    <span className="required-label">
                      Required
                    </span>
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="08012345678"
                    required
                  />
                </div>

                <div className="business-setup-field">
                  <label htmlFor="email">
                    Business email
                    <span className="required-label">
                      Required
                    </span>
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="hello@yourbusiness.com"
                    required
                  />
                </div>

                <div className="business-setup-field business-setup-field-full">
                  <label htmlFor="address">
                    Business address
                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter your business address"
                  />
                </div>

                <div className="business-setup-field business-setup-field-full">
                  <label htmlFor="whatsapp">
                    WhatsApp number
                    <span className="required-label">
                      Required
                    </span>
                  </label>

                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="08012345678"
                    required
                  />
                </div>
              </div>
            </section>

            <section className="business-setup-section">
              <div className="business-setup-section-heading">
                <div>
                  <div>
                    <h2>Social media</h2>

                    <p>
                      Add your social media accounts so
                      customers can find your business.
                    </p>
                  </div>
                </div>
              </div>

              <div className="business-setup-fields">
                <div className="business-setup-field">
                  <label htmlFor="instagram">
                    Instagram
                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <input
                    id="instagram"
                    name="instagram"
                    type="text"
                    value={form.instagram}
                    onChange={handleChange}
                    placeholder="@yourbusiness"
                  />
                </div>

                <div className="business-setup-field">
                  <label htmlFor="facebook">
                    Facebook
                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <input
                    id="facebook"
                    name="facebook"
                    type="text"
                    value={form.facebook}
                    onChange={handleChange}
                    placeholder="facebook.com/yourbusiness"
                  />
                </div>

                <div className="business-setup-field">
                  <label htmlFor="twitter">
                    X / Twitter
                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <input
                    id="twitter"
                    name="twitter"
                    type="text"
                    value={form.twitter}
                    onChange={handleChange}
                    placeholder="@yourbusiness"
                  />
                </div>

                <div className="business-setup-field">
                  <label htmlFor="tiktok">
                    TikTok
                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <input
                    id="tiktok"
                    name="tiktok"
                    type="text"
                    value={form.tiktok}
                    onChange={handleChange}
                    placeholder="@yourbusiness"
                  />
                </div>
              </div>
            </section>

            <section className="business-setup-section">
              <div className="business-setup-section-heading">
                <div>
                  <div>
                    <h2>Business logo</h2>

                    <p>
                      Add your logo now or upload one later
                      from your business account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="business-logo-upload">
                {logoPreview ? (
                  <div className="business-logo-preview">
                    <img
                      src={logoPreview}
                      alt="Business logo preview"
                    />

                    <label
                      htmlFor="logo"
                      className="business-logo-change"
                    >
                      Change logo
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="logo"
                    className="business-logo-empty"
                  >
                    <span className="business-logo-icon">
                      +
                    </span>

                    <strong>Choose a logo</strong>

                    <small>
                      PNG, JPG or WEBP
                    </small>
                  </label>
                )}

                <input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  hidden
                />
              </div>
            </section>

            {error && (
              <div className="business-setup-error">
                {error}
              </div>
            )}

            <div className="business-setup-submit-area">
              <div>
                <strong>
                  Ready to open your store?
                </strong>

                <p>
                  You can change these details anytime.
                </p>
              </div>

              <button
                type="submit"
                className="business-setup-submit"
                disabled={loading || uploadingLogo}
              >
                {loading
                  ? "Creating business..."
                  : "Create business"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}