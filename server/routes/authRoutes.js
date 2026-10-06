const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const router = express.Router();

const createResetTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const hashResetCode = (code) => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

const sendResetCodeEmail = async (email, fullName, resetCode) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  if (!process.env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL is not configured.");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: "Branda",
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [
            {
              email,
              name: fullName,
            },
          ],
          subject: "Your Branda password reset code",
          htmlContent: `
            <div style="font-family: Arial, Helvetica, sans-serif; background: #f4eee6; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: #fffaf4; padding: 40px;">
                <h1 style="margin: 0 0 20px; color: #2c1b13; font-size: 32px;">
                  Branda
                </h1>

                <h2 style="margin: 0 0 16px; color: #2c1b13;">
                  Reset your password
                </h2>

                <p style="color: #60483a; line-height: 1.7;">
                  Hello ${fullName},
                </p>

                <p style="color: #60483a; line-height: 1.7;">
                  We received a request to reset the password for your Branda account.
                  Use the verification code below to continue.
                </p>

                <div style="margin: 30px 0; text-align: center;">
                  <div style="
                    display: inline-block;
                    padding: 18px 30px;
                    background: #2c1b13;
                    color: #fffaf4;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                  ">
                    ${resetCode}
                  </div>
                </div>

                <p style="color: #806b5c; line-height: 1.6; font-size: 14px;">
                  This code will expire in 10 minutes.
                </p>

                <p style="color: #806b5c; line-height: 1.6; font-size: 14px;">
                  If you did not request a password reset, you can safely ignore this email.
                </p>

                <p style="color: #806b5c; line-height: 1.6; font-size: 14px;">
                  Do not share this code with anyone.
                </p>
              </div>
            </div>
          `,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Brevo email error: ${errorText}`
      );
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Brevo email request timed out after 15 seconds."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

router.post("/signup", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const {
      fullName,
      email,
      password,
      confirmPassword,
    } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, full_name, email
      `,
      [fullName.trim(), normalizedEmail, hashedPassword]
    );

    await new Promise((resolve, reject) => {
      req.session.regenerate((sessionError) => {
        if (sessionError) {
          reject(sessionError);
          return;
        }

        req.session.userId = result.rows[0].id;

        req.session.save((saveError) => {
          if (saveError) {
            reject(saveError);
            return;
          }

          resolve();
        });
      });
    });

    return res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Unable to create account.",
    });
  }
});

router.post("/login", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT id, full_name, email, password
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((sessionError) => {
        if (sessionError) {
          reject(sessionError);
          return;
        }

        req.session.userId = user.id;

        req.session.save((saveError) => {
          if (saveError) {
            reject(saveError);
            return;
          }

          resolve();
        });
      });
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to sign in.",
    });
  }
});

router.post("/change-password", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "You must be signed in.",
      });
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, password
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [hashedPassword, user.id]
    );

    return res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "Unable to change password.",
    });
  }
});

router.get("/me", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, full_name, email
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      req.session.userId = null;

      return res.status(401).json({
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      message: "Unable to get account information.",
    });
  }
});

router.post("/logout", async (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        message: "Unable to log out.",
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});

router.post("/forgot-password", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    await createResetTable(pool);

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT id, full_name, email
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message:
          "If an account exists, a verification code has been sent.",
      });
    }

    const user = result.rows[0];

    await pool.query(
      `
      DELETE FROM password_reset_tokens
      WHERE user_id = $1
      `,
      [user.id]
    );

    const resetCode = crypto
      .randomInt(100000, 1000000)
      .toString();

    const tokenHash = hashResetCode(resetCode);

    await pool.query(
      `
      INSERT INTO password_reset_tokens
      (user_id, token_hash, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
      `,
      [user.id, tokenHash]
    );

    try {
      await sendResetCodeEmail(
        user.email,
        user.full_name,
        resetCode
      );
    } catch (emailError) {
      await pool.query(
        `
        DELETE FROM password_reset_tokens
        WHERE user_id = $1
        `,
        [user.id]
      );

      throw emailError;
    }

    return res.json({
      success: true,
      message:
        "A verification code has been sent to your email address.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message:
        process.env.NODE_ENV === "production"
          ? "Unable to send the verification code."
          : error.message,
    });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    await createResetTable(pool);

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and verification code are required.",
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "Please enter the 6-digit verification code.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        message:
          "The verification code is incorrect or has expired.",
      });
    }

    const user = userResult.rows[0];

    const tokenHash = hashResetCode(code);

    const tokenResult = await pool.query(
      `
      SELECT id
      FROM password_reset_tokens
      WHERE user_id = $1
      AND token_hash = $2
      AND expires_at > NOW()
      `,
      [user.id, tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        message:
          "The verification code is incorrect or has expired.",
      });
    }

    req.session.passwordResetUserId = user.id;
    req.session.passwordResetVerified = true;

    await pool.query(
      `
      DELETE FROM password_reset_tokens
      WHERE user_id = $1
      `,
      [user.id]
    );

    req.session.save((sessionError) => {
      if (sessionError) {
        console.error(
          "Password reset session save error:",
          sessionError
        );

        return res.status(500).json({
          message:
            "Unable to continue password reset. Please try again.",
        });
      }

      return res.json({
        success: true,
        message: "Verification successful.",
      });
    });
  } catch (error) {
    console.error("Verify reset code error:", error);

    return res.status(500).json({
      message: "Unable to verify the code.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  const pool = req.app.locals.pool;

  try {
    const {
      password,
      confirmPassword,
    } = req.body;

    if (
      !req.session.passwordResetUserId ||
      !req.session.passwordResetVerified
    ) {
      return res.status(401).json({
        message: "Please verify your reset code first.",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        message: "Both password fields are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    const userId = req.session.passwordResetUserId;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      RETURNING id
      `,
      [hashedPassword, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User account could not be found.",
      });
    }

    req.session.passwordResetUserId = null;
    req.session.passwordResetVerified = false;

    await new Promise((resolve, reject) => {
      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
          return;
        }

        resolve();
      });
    });

    return res.json({
      success: true,
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Unable to reset your password.",
    });
  }
});

module.exports = router;