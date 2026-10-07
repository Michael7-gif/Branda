import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/store.css";
import API_URL from "../services/api";
import {
  getCachedBusiness,
  getMyBusiness,
  setMyBusiness
} from "../services/businessCache";

function normalizeBusiness(data) {
  if (!data) {
    return null;
  }

  const business = data.business || data;

  return {
    ...business,

    businessName:
      business.businessName ||
      business.business_name ||
      "",

    description:
      business.description ||
      "",

    phone:
      business.phone ||
      "",

    email:
      business.email ||
      "",

    address:
      business.address ||
      "",

    whatsapp:
      business.whatsapp ||
      business.whatsApp ||
      business.whatsapp_number ||
      "",

    instagram:
      business.instagram ||
      "",

    facebook:
      business.facebook ||
      "",

    twitter:
      business.twitter ||
      "",

    logoUrl:
      business.logoUrl ||
      business.logo_url ||
      "",

    slug:
      business.slug ||
      business.business_slug ||
      "",

    deliveryFee:
      business.deliveryFee ??
      business.delivery_fee ??
      0,

    freeDelivery:
      business.freeDelivery ??
      business.free_delivery ??
      false,

    freeDeliveryAmount:
      business.freeDeliveryAmount ??
      business.free_delivery_amount ??
      0
  };
}

function createFormFromBusiness(business) {
  const normalized = normalizeBusiness(business);

  return {
    businessName: normalized?.businessName || "",
    description: normalized?.description || "",
    phone: normalized?.phone || "",
    email: normalized?.email || "",
    address: normalized?.address || "",
    whatsapp: normalized?.whatsapp || "",
    instagram: normalized?.instagram || "",
    facebook: normalized?.facebook || "",
    twitter: normalized?.twitter || "",
    logoUrl: normalized?.logoUrl || "",

    deliveryFee:
      normalized?.deliveryFee ?? 0,

    freeDelivery:
      Boolean(normalized?.freeDelivery),

    freeDeliveryAmount:
      normalized?.freeDeliveryAmount ?? 0
  };
}

export default function Store() {
  const navigate = useNavigate();

  const [business, setBusiness] = useState(() =>
    normalizeBusiness(getCachedBusiness())
  );

  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [form, setForm] = useState(() =>
    createFormFromBusiness(getCachedBusiness())
  );

  useEffect(() => {
    window.scrollTo(0, 0);

    const savedBusiness = normalizeBusiness(
      getCachedBusiness()
    );

    if (savedBusiness) {
      setBusiness(savedBusiness);
      setForm(createFormFromBusiness(savedBusiness));
    }

    loadBusiness();
  }, []);

  async function loadBusiness() {
    try {
      const currentBusiness = await getMyBusiness();

      if (!currentBusiness) {
        navigate("/login");
        return;
      }

      const loadedBusiness = normalizeBusiness(currentBusiness);

      setBusiness(loadedBusiness);
      setMyBusiness(loadedBusiness);

      setForm(createFormFromBusiness(loadedBusiness));
    } catch (requestError) {
      if (requestError.status === 401) {
        navigate("/login");
        return;
      }

      console.error(requestError);
    }
  }

  function openEditForm() {
    setForm(createFormFromBusiness(business));
    setSaveError("");
    setSaveSuccess("");
    setEditing(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSaveError("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Please choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingLogo(true);
      setSaveError("");
      setSaveSuccess("");

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
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ image })
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.image?.url
      ) {
        throw new Error(
          data.message ||
            "Unable to upload the logo."
        );
      }

      setForm((current) => ({
        ...current,
        logoUrl: data.image.url
      }));

      setSaveSuccess(
        "Logo uploaded successfully."
      );
    } catch (err) {
      setSaveError(
        err.message ||
          "Unable to upload the logo."
      );
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!form.businessName.trim()) {
      setSaveError(
        "Business name is required."
      );
      return;
    }

    if (!form.whatsapp.trim()) {
      setSaveError(
        "WhatsApp number is required."
      );
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveSuccess("");

      const response = await fetch(
        `${API_URL}/api/business/me`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            businessName:
              form.businessName.trim(),

            description:
              form.description.trim(),

            phone:
              form.phone.trim(),

            email:
              form.email.trim(),

            address:
              form.address.trim(),

            whatsapp:
              form.whatsapp.trim(),

            instagram:
              form.instagram.trim(),

            facebook:
              form.facebook.trim(),

            twitter:
              form.twitter.trim(),

            logoUrl:
              form.logoUrl,

            deliveryFee:
              Number.isFinite(
                Number(form.deliveryFee)
              )
                ? Number(form.deliveryFee)
                : 0,

            freeDelivery:
              Boolean(form.freeDelivery),

            freeDeliveryAmount:
              Number.isFinite(
                Number(form.freeDeliveryAmount)
              )
                ? Number(form.freeDeliveryAmount)
                : 0
          })
        }
      );

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to save your store."
        );
      }

      const updatedBusiness =
        normalizeBusiness(data);

      setBusiness(updatedBusiness);

      setForm(
        createFormFromBusiness(
          updatedBusiness
        )
      );

      setMyBusiness(updatedBusiness);

      setSaveSuccess(
        "Store updated successfully."
      );

      setTimeout(() => {
        setEditing(false);
        setSaveSuccess("");
      }, 700);
    } catch (err) {
      setSaveError(
        err.message ||
          "Unable to save your store."
      );
    } finally {
      setSaving(false);
    }
  }

  function getInitial(name) {
    return (
      name
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() ||
      "B"
    );
  }

  const businessName =
    business?.businessName ||
    "Your Store";

  const logoUrl =
    business?.logoUrl || "";

  const description =
    business?.description || "";

  const slug =
    business?.slug || "";

  return (
    <div className="store-page">
      <header className="store-header-bar">
        <Link
          to="/dashboard"
          className="store-logo-brand"
        >
          Branda
        </Link>

        <nav className="store-header-nav">
          <Link to="/dashboard">
            Home
          </Link>

          {slug && (
            <Link
              to={`/store/${slug}`}
            >
              View Store
            </Link>
          )}
        </nav>
      </header>

      <main className="store-main">
        <section className="store-intro">
          <div>
            <p className="store-eyebrow">
              STORE MANAGEMENT
            </p>

            <h1>Your Store</h1>

            <p className="store-intro-text">
              Manage the information
              customers see when they visit
              your store.
            </p>
          </div>

          {business && (
            <div className="store-intro-actions">
              <button
                type="button"
                className="store-secondary-button"
                onClick={openEditForm}
              >
                Edit Store
              </button>

              {slug && (
                <Link
                  to={`/store/${slug}`}
                  className="store-primary-button"
                >
                  View Store
                </Link>
              )}
            </div>
          )}
        </section>

        {error && (
          <section className="store-message store-error">
            {error}
          </section>
        )}

        {!business && !error && (
          <section className="store-empty">
            <h2>
              No store found
            </h2>

            <p>
              Create your business
              profile before managing
              your store.
            </p>

            <Link
              to="/business-setup"
              className="store-primary-button"
            >
              Create Store
            </Link>
          </section>
        )}

        {business && (
          <>
            <section className="store-overview">
              <div className="store-overview-brand">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={businessName}
                  />
                ) : (
                  <div className="store-logo-placeholder">
                    {getInitial(
                      businessName
                    )}
                  </div>
                )}
              </div>

              <div className="store-overview-content">
                <p className="store-section-label">
                  YOUR BUSINESS
                </p>

                <h2>
                  {businessName}
                </h2>

                <p>
                  {description ||
                    "Add a description to tell customers more about your business."}
                </p>

                {slug && (
                  <div className="store-url">
                    <span>
                      Your store
                    </span>

                    <Link
                      to={`/store/${slug}`}
                    >
                      /store/{slug}
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section className="store-details-section">
              <div className="store-section-heading">
                <p className="store-section-label">
                  STORE DETAILS
                </p>

                <h2>
                  Your information
                </h2>
              </div>

              <div className="store-details-grid">
                <div className="store-detail">
                  <span>
                    Business name
                  </span>

                  <strong>
                    {businessName}
                  </strong>
                </div>

                <div className="store-detail">
                  <span>
                    Phone
                  </span>

                  <strong>
                    {business.phone ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="store-detail">
                  <span>
                    Email
                  </span>

                  <strong>
                    {business.email ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="store-detail">
                  <span>
                    Address
                  </span>

                  <strong>
                    {business.address ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="store-detail">
                  <span>
                    WhatsApp
                  </span>

                  <strong>
                    {business.whatsapp ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="store-detail">
                  <span>
                    Instagram
                  </span>

                  <strong>
                    {business.instagram ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="store-detail">
                  <span>
                    Facebook
                  </span>

                  <strong>
                    {business.facebook ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="store-detail">
                  <span>
                    Twitter
                  </span>

                  <strong>
                    {business.twitter ||
                      "Not provided"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="store-preview-section">
              <div className="store-section-heading">
                <p className="store-section-label">
                  STORE PREVIEW
                </p>

                <h2>
                  What customers see
                </h2>
              </div>

              <div className="store-preview">
                <div className="store-preview-logo">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={businessName}
                    />
                  ) : (
                    <span>
                      {getInitial(
                        businessName
                      )}
                    </span>
                  )}
                </div>

                <div className="store-preview-content">
                  <h3>
                    {businessName}
                  </h3>

                  <p>
                    {description ||
                      "Your store description will appear here."}
                  </p>

                  {slug && (
                    <Link
                      to={`/store/${slug}`}
                      className="store-preview-link"
                    >
                      Open Store
                    </Link>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {editing && (
        <div
          className="store-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving &&
              !uploadingLogo
            ) {
              setEditing(false);
            }
          }}
        >
          <div className="store-modal">
            <div className="store-modal-header">
              <div>
                <p className="store-section-label">
                  STORE SETTINGS
                </p>

                <h2>
                  Edit Store
                </h2>
              </div>

              <button
                type="button"
                className="store-modal-close"
                onClick={() => {
                  if (
                    !saving &&
                    !uploadingLogo
                  ) {
                    setEditing(false);
                  }
                }}
                aria-label="Close"
              >
                Ã—
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="store-form-grid">
                <label>
                  <span>
                    Business Name
                  </span>

                  <input
                    type="text"
                    name="businessName"
                    value={
                      form.businessName
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </label>

                <label>
                  <span>
                    Phone
                  </span>

                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={
                      handleChange
                    }
                  />
                </label>

                <label>
                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={
                      handleChange
                    }
                  />
                </label>

                <label>
                  <span>
                    WhatsApp
                  </span>

                  <input
                    type="text"
                    name="whatsapp"
                    value={
                      form.whatsapp
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </label>

                <label className="store-form-full">
                  <span>
                    Address (Optional)
                  </span>

                  <input
                    type="text"
                    name="address"
                    value={
                      form.address
                    }
                    onChange={
                      handleChange
                    }
                  />
                </label>

                <label>
                  <span>
                    Instagram (Optional)
                  </span>

                  <input
                    type="text"
                    name="instagram"
                    value={
                      form.instagram
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="@yourstore"
                  />
                </label>

                <label>
                  <span>
                    Facebook (Optional)
                  </span>

                  <input
                    type="text"
                    name="facebook"
                    value={
                      form.facebook
                    }
                    onChange={
                      handleChange
                    }
                  />
                </label>

                <label>
                  <span>
                    Twitter (Optional)
                  </span>

                  <input
                    type="text"
                    name="twitter"
                    value={
                      form.twitter
                    }
                    onChange={
                      handleChange
                    }
                  />
                </label>

                <label className="store-form-full">
                  <span>
                    Store Logo
                  </span>

                  <div className="store-logo-upload">
                    {form.logoUrl && (
                      <img
                        src={
                          form.logoUrl
                        }
                        alt="Store logo preview"
                      />
                    )}

                    <label className="store-upload-button">
                      {uploadingLogo
                        ? "Uploading..."
                        : "Choose Image"}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handleLogoChange
                        }
                        disabled={
                          uploadingLogo ||
                          saving
                        }
                      />
                    </label>
                  </div>
                </label>

                <label className="store-form-full">
                  <span>
                    Description (Optional)
                  </span>

                  <textarea
                    name="description"
                    value={
                      form.description
                    }
                    onChange={
                      handleChange
                    }
                    rows="5"
                    placeholder="Tell customers about your business..."
                  />
                </label>
              </div>

              {saveError && (
                <p className="store-form-message store-form-error">
                  {saveError}
                </p>
              )}

              {saveSuccess && (
                <p className="store-form-message store-form-success">
                  {saveSuccess}
                </p>
              )}

              <div className="store-modal-actions">
                <button
                  type="button"
                  className="store-cancel-button"
                  onClick={() => {
                    if (
                      !saving &&
                      !uploadingLogo
                    ) {
                      setEditing(false);
                    }
                  }}
                  disabled={
                    saving ||
                    uploadingLogo
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="store-save-button"
                  disabled={
                    saving ||
                    uploadingLogo
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}