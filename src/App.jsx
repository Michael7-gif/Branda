import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Home from "./pages/Home";
import {
  getMyBusiness,
  getCachedBusiness,
  clearMyBusiness,
} from "./services/businessCache";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyResetCode = lazy(() => import("./pages/VerifyResetCode"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const Customers = lazy(() => import("./pages/Customers"));
const Store = lazy(() => import("./pages/Store"));
const Delivery = lazy(() => import("./pages/Delivery"));
const Payments = lazy(() => import("./pages/Payments"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Account = lazy(() => import("./pages/Account"));
const BusinessSetup = lazy(() => import("./pages/BusinessSetup"));
const Storefront = lazy(() => import("./pages/Storefront"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));

function RouteLoading() {
  return (
    <div
      aria-busy="true"
      style={{
        minHeight: "100vh",
        background: "#f8f3ed"
      }}
    />
  );
}

function SellerRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(!getCachedBusiness());
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkBusiness() {
      try {
        const business = await getMyBusiness();

        if (cancelled) {
          return;
        }

        if (!business) {
          setChecking(false);
          navigate("/business-setup", {
            replace: true,
            state: { from: location.pathname }
          });
          return;
        }

        setChecking(false);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError.status === 401) {
          clearMyBusiness();
          navigate("/login", {
            replace: true,
            state: { from: location.pathname }
          });
          return;
        }

        if (requestError.status === 404) {
          clearMyBusiness();
          navigate("/business-setup", {
            replace: true,
            state: { from: location.pathname }
          });
          return;
        }

        console.error(requestError);
        setError(
          "Unable to connect to Branda. Please check your connection and try again."
        );
        setChecking(false);
      }
    }

    checkBusiness();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (checking) {
    return <RouteLoading />;
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
          textAlign: "center"
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
      <Suspense fallback={<RouteLoading />}>
        <Routes>
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
          <Route
            path="/business-setup"
            element={<BusinessSetup />}
          />

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
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/store/:slug/checkout"
            element={<Checkout />}
          />
          <Route path="/checkout" element={<Checkout />} />
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

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
