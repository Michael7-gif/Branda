import { BrowserRouter, Routes, Route } from "react-router-dom";

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

function App() {
  return (
    <BrowserRouter>
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
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/dashboard/products"
          element={<Products />}
        />

        <Route
          path="/dashboard/orders"
          element={<Orders />}
        />

        <Route
          path="/dashboard/customers"
          element={<Customers />}
        />

        <Route
          path="/dashboard/store"
          element={<Store />}
        />

        <Route
          path="/dashboard/delivery"
          element={<Delivery />}
        />

        <Route
          path="/dashboard/payments"
          element={<Payments />}
        />

        <Route
          path="/dashboard/analytics"
          element={<Analytics />}
        />

        <Route
          path="/dashboard/account"
          element={<Account />}
        />

        <Route
          path="/business-setup"
          element={<BusinessSetup />}
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;