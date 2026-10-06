const express = require("express");
const axios = require("axios");

const router = express.Router();

const paystackHeaders = {
  Authorization:
    "Bearer " + process.env.PAYSTACK_SECRET_KEY,
  "Content-Type": "application/json",
};

const getBusinessForUser = async (req) => {
  if (!req.session.userId) {
    return null;
  }

  const result = await req.app.locals.pool.query(
    `SELECT *
     FROM businesses
     WHERE user_id = $1`,
    [req.session.userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

const createPaystackSubaccount = async ({
  business,
  bankCode,
  accountNumber,
  accountName,
}) => {
  const subaccountData = {
    business_name: business.business_name,
    settlement_bank: bankCode,
    account_number: accountNumber,
    percentage_charge: 0,
    description:
      business.description ||
      "Branda business payment account",
    primary_contact_email:
      business.email || undefined,
    primary_contact_phone:
      business.phone || undefined,
    primary_contact_name: accountName,
    active: true,
  };

  const response = await axios.post(
    "https://api.paystack.co/subaccount",
    subaccountData,
    {
      headers: paystackHeaders,
    }
  );

  const subaccountCode =
    response.data.data?.subaccount_code;

  if (!subaccountCode) {
    throw new Error(
      "Paystack did not return a subaccount code."
    );
  }

  return subaccountCode;
};

const checkPaystackSubaccount = async (
  subaccountCode
) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/subaccount/${encodeURIComponent(
        subaccountCode
      )}`,
      {
        headers: paystackHeaders,
      }
    );

    return response.data.data || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

router.get("/banks", async (req, res) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message:
          "Paystack is not configured on the server.",
      });
    }

    const response = await axios.get(
      "https://api.paystack.co/bank?country=nigeria&perPage=100",
      {
        headers: paystackHeaders,
      }
    );

    res.json({
      success: true,
      banks: response.data.data || [],
    });
  } catch (error) {
    console.error(
      "Get Paystack banks error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to load banks.",
    });
  }
});

router.post("/account/verify", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const {
      accountNumber,
      bankCode,
    } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        success: false,
        message:
          "Bank and account number are required.",
      });
    }

    if (!/^\d{10}$/.test(String(accountNumber))) {
      return res.status(400).json({
        success: false,
        message:
          "Account number must contain exactly 10 digits.",
      });
    }

    const response = await axios.get(
      "https://api.paystack.co/bank/resolve",
      {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
        headers: paystackHeaders,
      }
    );

    const account = response.data.data;

    res.json({
      success: true,
      account: {
        accountNumber:
          account.account_number ||
          accountNumber,
        accountName: account.account_name,
      },
    });
  } catch (error) {
    console.error(
      "Verify bank account error:",
      error.response?.data || error.message
    );

    res.status(400).json({
      success: false,
      message:
        error.response?.data?.message ||
        "Unable to verify this bank account.",
    });
  }
});

router.post("/account", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const {
      bankName,
      bankCode,
      accountNumber,
      accountName,
    } = req.body;

    if (
      !bankName ||
      !bankCode ||
      !accountNumber ||
      !accountName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All payment account information is required.",
      });
    }

    if (!/^\d{10}$/.test(String(accountNumber))) {
      return res.status(400).json({
        success: false,
        message:
          "Account number must contain exactly 10 digits.",
      });
    }

    const business =
      await getBusinessForUser(req);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    const verifyResponse = await axios.get(
      "https://api.paystack.co/bank/resolve",
      {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
        headers: paystackHeaders,
      }
    );

    const verifiedAccount =
      verifyResponse.data.data;

    if (!verifiedAccount?.account_name) {
      return res.status(400).json({
        success: false,
        message:
          "Paystack could not verify this bank account.",
      });
    }

    const verifiedAccountName =
      verifiedAccount.account_name.trim();

    let subaccountCode =
      business.paystack_subaccount_code ||
      null;

    if (subaccountCode) {
      const existingSubaccount =
        await checkPaystackSubaccount(
          subaccountCode
        );

      if (!existingSubaccount) {
        subaccountCode = null;
      }
    }

    if (subaccountCode) {
      const subaccountData = {
        business_name:
          business.business_name,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 0,
        description:
          business.description ||
          "Branda business payment account",
        primary_contact_email:
          business.email || undefined,
        primary_contact_phone:
          business.phone || undefined,
        primary_contact_name:
          verifiedAccountName,
        active: true,
      };

      const response = await axios.put(
        `https://api.paystack.co/subaccount/${encodeURIComponent(
          subaccountCode
        )}`,
        subaccountData,
        {
          headers: paystackHeaders,
        }
      );

      subaccountCode =
        response.data.data
          ?.subaccount_code ||
        subaccountCode;
    } else {
      subaccountCode =
        await createPaystackSubaccount({
          business,
          bankCode,
          accountNumber,
          accountName:
            verifiedAccountName,
        });
    }

    const updatedBusiness =
      await req.app.locals.pool.query(
        `UPDATE businesses
         SET
          payment_bank_name = $1,
          payment_bank_code = $2,
          payment_account_name = $3,
          payment_account_number = $4,
          paystack_subaccount_code = $5
         WHERE id = $6
         RETURNING
          id,
          business_name,
          payment_bank_name,
          payment_bank_code,
          payment_account_name,
          payment_account_number,
          paystack_subaccount_code`,
        [
          bankName,
          bankCode,
          verifiedAccountName,
          accountNumber,
          subaccountCode,
          business.id,
        ]
      );

    res.json({
      success: true,
      message:
        "Payment account connected successfully.",
      paymentAccount:
        updatedBusiness.rows[0],
    });
  } catch (error) {
    console.error(
      "Save payment account error:",
      error.response?.data ||
        error.message
    );

    res.status(400).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to connect this payment account.",
    });
  }
});

router.get("/account", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const result =
      await req.app.locals.pool.query(
        `SELECT
          payment_bank_name,
          payment_bank_code,
          payment_account_name,
          payment_account_number,
          paystack_subaccount_code
         FROM businesses
         WHERE user_id = $1`,
        [req.session.userId]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    res.json({
      success: true,
      paymentAccount:
        result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get payment account error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to load payment account.",
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const pool = req.app.locals.pool;

    const businessResult =
      await pool.query(
        `SELECT id
         FROM businesses
         WHERE user_id = $1`,
        [req.session.userId]
      );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    const businessId =
      businessResult.rows[0].id;

    const result = await pool.query(
      `SELECT
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_phone,
        o.total_amount,
        o.payment_status,
        o.payment_reference,
        o.status,
        o.created_at
       FROM orders o
       WHERE o.business_id = $1
         AND o.payment_reference IS NOT NULL
       ORDER BY o.created_at DESC`,
      [businessId]
    );

    const payments = result.rows.map(
      (payment) => ({
        id: payment.id,
        orderNumber:
          payment.order_number,
        customerName:
          payment.customer_name,
        customerPhone:
          payment.customer_phone,
        amount:
          Number(payment.total_amount),
        paymentStatus:
          payment.payment_status,
        paymentReference:
          payment.payment_reference,
        orderStatus:
          payment.status,
        createdAt:
          payment.created_at,
      })
    );

    const successfulPayments =
      payments.filter(
        (payment) =>
          payment.paymentStatus ===
          "paid"
      );

    const totalPayments =
      successfulPayments.reduce(
        (total, payment) =>
          total +
          Number(payment.amount || 0),
        0
      );

    const currentDate = new Date();

    const monthPayments =
      successfulPayments.filter(
        (payment) => {
          const paymentDate =
            new Date(payment.createdAt);

          return (
            paymentDate.getMonth() ===
              currentDate.getMonth() &&
            paymentDate.getFullYear() ===
              currentDate.getFullYear()
          );
        }
      );

    const thisMonth =
      monthPayments.reduce(
        (total, payment) =>
          total +
          Number(payment.amount || 0),
        0
      );

    res.json({
      success: true,
      payments,
      summary: {
        totalPayments,
        successfulCount:
          successfulPayments.length,
        pendingCount:
          payments.filter(
            (payment) =>
              payment.paymentStatus !==
              "paid"
          ).length,
        thisMonth,
      },
    });
  } catch (error) {
    console.error(
      "Get payment history error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to load payment history.",
    });
  }
});

router.post("/initialize", async (req, res) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message:
          "Paystack is not configured on the server.",
      });
    }

    const {
      email,
      slug,
      customerName,
      customerPhone,
      customerAddress,
      customerCity,
      customerState,
      items,
    } = req.body;

    if (
      !email ||
      !slug ||
      !customerName ||
      !customerPhone ||
      !customerAddress ||
      !customerCity ||
      !customerState
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All checkout information is required.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    const cleanedItems = items.map(
      (item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })
    );

    for (const item of cleanedItems) {
      if (
        item.productId === undefined ||
        item.productId === null ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid cart information.",
        });
      }
    }

    const productIds =
      cleanedItems.map(
        (item) => Number(item.productId)
      );

    if (
      productIds.some(
        (id) =>
          !Number.isInteger(id) ||
          id <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid product information.",
      });
    }

    const businessResult =
      await req.app.locals.pool.query(
        `SELECT
          id,
          business_name,
          email,
          delivery_fee,
          free_delivery,
          free_delivery_amount,
          paystack_subaccount_code
         FROM businesses
         WHERE slug = $1`,
        [slug]
      );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Store not found.",
      });
    }

    const business =
      businessResult.rows[0];

    if (
      !business.paystack_subaccount_code
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This store has not connected a payment account yet.",
      });
    }

    const validSubaccount =
      await checkPaystackSubaccount(
        business.paystack_subaccount_code
      );

    if (!validSubaccount) {
      return res.status(400).json({
        success: false,
        message:
          "This store's Paystack payment account is no longer valid. Please reconnect the payment account from Store Settings > Payments.",
      });
    }

    const productsResult =
      await req.app.locals.pool.query(
        `SELECT
          id,
          name,
          price,
          discount_price,
          stock,
          status
         FROM products
         WHERE business_id = $1
           AND id = ANY($2)
           AND status = 'active'`,
        [business.id, productIds]
      );

    const uniqueProductIds = [
      ...new Set(
        productIds.map(String)
      ),
    ];

    if (
      productsResult.rows.length !==
      uniqueProductIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "One or more products in your cart are no longer available.",
      });
    }

    const productMap = new Map();

    productsResult.rows.forEach(
      (product) => {
        productMap.set(
          String(product.id),
          product
        );
      }
    );

    let subtotal = 0;

    for (const item of cleanedItems) {
      const product =
        productMap.get(
          String(item.productId)
        );

      if (!product) {
        return res.status(400).json({
          success: false,
          message:
            "One or more products in your cart are no longer available.",
        });
      }

      if (
        Number(product.stock) <
        item.quantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${product.name} does not have enough stock.`,
        });
      }

      const unitPrice =
        product.discount_price !== null
          ? Number(
              product.discount_price
            )
          : Number(product.price);

      subtotal +=
        unitPrice * item.quantity;
    }

    if (
      !Number.isFinite(subtotal) ||
      subtotal <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to calculate your order total.",
      });
    }

    /*
     * Delivery is calculated entirely on the server.
     * The browser cannot change the amount being charged.
     */
    const configuredDeliveryFee =
      Number(business.delivery_fee) || 0;

    const freeDelivery =
      business.free_delivery === true;

    const freeDeliveryAmount =
      Number(
        business.free_delivery_amount
      ) || 0;

    const deliveryFee =
      freeDelivery &&
      subtotal >= freeDeliveryAmount
        ? 0
        : configuredDeliveryFee;

    const orderTotal =
      subtotal + deliveryFee;

    if (
      !Number.isFinite(orderTotal) ||
      orderTotal <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to calculate your order total.",
      });
    }

    /*
     * Paystack expects NGN amounts in kobo.
     */
    const amountInKobo =
      Math.round(orderTotal * 100);

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,

        /*
         * IMPORTANT:
         * This is now the product subtotal PLUS
         * the applicable delivery fee.
         */
        amount: amountInKobo,

        subaccount:
          business.paystack_subaccount_code,

        bearer: "subaccount",

        callback_url:
          frontendUrl +
          "/store/" +
          encodeURIComponent(slug) +
          "/payment-success",

        metadata: {
          slug,
          customerName,
          customerPhone,
          customerAddress,
          customerCity,
          customerState,
          items: cleanedItems,

          /*
           * Keep the complete server-calculated
           * breakdown in Paystack metadata.
           */
          subtotal,
          deliveryFee,
          orderTotal,
        },
      },
      {
        headers: paystackHeaders,
      }
    );

    const paymentData =
      response.data.data;

    res.json({
      success: true,
      message:
        "Payment initialized successfully.",
      payment: {
        authorizationUrl:
          paymentData.authorization_url,

        accessCode:
          paymentData.access_code,

        reference:
          paymentData.reference,

        /*
         * Return the actual amount being charged,
         * not just the product subtotal.
         */
        amount: orderTotal,

        subtotal,
        deliveryFee,

        currency: "NGN",

        subaccount:
          business.paystack_subaccount_code,
      },
    });
  } catch (error) {
    console.error(
      "Paystack initialization error:",
      error.response?.data ||
        error.message
    );

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.message ||
        "Unable to initialize payment.",
    });
  }
});

router.get(
  "/verify/:reference",
  async (req, res) => {
    try {
      if (!process.env.PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message:
            "Paystack is not configured on the server.",
        });
      }

      const { reference } =
        req.params;

      if (!reference) {
        return res.status(400).json({
          success: false,
          message:
            "Payment reference is required.",
        });
      }

      const response =
        await axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(
            reference
          )}`,
          {
            headers: paystackHeaders,
          }
        );

      const payment =
        response.data.data;

      if (!payment) {
        return res.status(400).json({
          success: false,
          message:
            "Paystack did not return payment information.",
        });
      }

      res.json({
        success: true,
        payment: {
          reference:
            payment.reference,

          status:
            payment.status,

          amount:
            Number(payment.amount) /
            100,

          currency:
            payment.currency,

          paidAt:
            payment.paid_at,

          email:
            payment.customer?.email ||
            "",

          subaccount:
            payment.subaccount ||
            null,
        },
      });
    } catch (error) {
      console.error(
        "Paystack verification error:",
        error.response?.data ||
          error.message
      );

      res.status(500).json({
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to verify payment.",
      });
    }
  }
);

router.get(
  "/account/paystack-details",
  async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message:
            "You must be signed in.",
        });
      }

      const result =
        await req.app.locals.pool.query(
          `SELECT paystack_subaccount_code
           FROM businesses
           WHERE user_id = $1`,
          [req.session.userId]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Business not found.",
        });
      }

      const subaccountCode =
        result.rows[0]
          .paystack_subaccount_code;

      if (!subaccountCode) {
        return res.status(404).json({
          success: false,
          message:
            "No Paystack subaccount is connected.",
        });
      }

      const response =
        await axios.get(
          `https://api.paystack.co/subaccount/${encodeURIComponent(
            subaccountCode
          )}`,
          {
            headers:
              paystackHeaders,
          }
        );

      res.json({
        success: true,
        subaccount:
          response.data.data,
      });
    } catch (error) {
      console.error(
        "Get Paystack subaccount error:",
        error.response?.data ||
          error.message
      );

      if (
        error.response?.status ===
        404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Subaccount not found",
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.response?.data
            ?.message ||
          "Unable to retrieve Paystack subaccount.",
      });
    }
  }
);

module.exports = router;