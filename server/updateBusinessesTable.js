const pool = require("./db");

async function updateBusinessesTable() {
  try {
    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS payment_bank_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS payment_bank_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS payment_account_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS payment_account_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS paystack_subaccount_code VARCHAR(100);
    `);

    console.log("Businesses table updated successfully.");
  } catch (error) {
    console.error("Update businesses table error:", error);
  } finally {
    await pool.end();
  }
}

updateBusinessesTable();