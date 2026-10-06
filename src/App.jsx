import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetCode from "./pages/VerifyResetCode";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Store from "./pages/Store";
import Delivery from "./pages/Delivery";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import Account from "./pages/Account";
import BusinessSetup from "./pages/BusinessSetup";

import Storefront from "./pages/Storefront";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import PaymentSuccess from "./pages/PaymentSuccess";

import API_URL from "./services/api";

function SellerRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const checkBusiness = async () => {
      setChecking(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/api/business/me`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json().catch(() => ({}));

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          navigate("/login", {
            replace: true,
            state: { from: location.pathname },
          });
          return;
        }

        if (response.status === 404) {
          navigate("/business-setup", {
            replace: true,
            state: { from: location.pathname },
          });
          return;
        }

        if (!response.ok) {
          setError(
            data.message ||
              "Unable to verify your business. Please try again."
          );
          setChecking(false);
          return;
        }

        setChecking(false);
      } catch (requestError) {
        console.error(requestError);

        if (!cancelled) {
          setError(
            "Unable to connect to Branda. Please check your connection and try again."
          );
          setChecking(false);
        }
      }
    };

    checkBusiness();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (checking) {
    return null;
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/verify-reset-code"
          element={<VerifyResetCode />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* Business registration */}
        <Route
          path="/business-setup"
          element={<BusinessSetup />}
        />

        {/* Protected seller pages */}
        <Route
          path="/dashboard"
          element={
            <SellerRoute>
              <Dashboard />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/products"
          element={
            <SellerRoute>
              <Products />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/orders"
          element={
            <SellerRoute>
              <Orders />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/customers"
          element={
            <SellerRoute>
              <Customers />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/store"
          element={
            <SellerRoute>
              <Store />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/delivery"
          element={
            <SellerRoute>
              <Delivery />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/payments"
          element={
            <SellerRoute>
              <Payments />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/analytics"
          element={
            <SellerRoute>
              <Analytics />
            </SellerRoute>
          }
        />

        <Route
          path="/dashboard/account"
          element={
            <SellerRoute>
              <Account />
            </SellerRoute>
          }
        />

        {/* Public storefront */}
        <Route
          path="/store/:slug"
          element={<Storefront />}
        />

        <Route
          path="/store/:slug/product/:productId"
          element={<ProductDetails />}
        />

        <Route
          path="/store/:slug/cart"
          element={<Cart />}
        />

        <Route
          path="/cart"
          element={<Cart />}
        />

        <Route
          path="/store/:slug/checkout"
          element={<Checkout />}
        />

        <Route
          path="/checkout"
          element={<Checkout />}
        />

        <Route
          path="/store/:slug/payment-success"
          element={<PaymentSuccess />}
        />

        <Route
          path="/payment-success"
          element={<PaymentSuccess />}
        />

        <Route
          path="/store/:slug/order-confirmation"
          element={<OrderConfirmation />}
        />

        <Route
          path="/order-confirmation"
          element={<OrderConfirmation />}
        />

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;