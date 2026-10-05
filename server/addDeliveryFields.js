const pool = require("./db");

async function addDeliveryFields() {
  try {
    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS free_delivery BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS free_delivery_amount NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(100) DEFAULT '1–3 business days';
    `);

    console.log("Delivery fields added successfully.");
  } catch (error) {
    console.error("Error adding delivery fields:", error);
  } finally {
    await pool.end();
  }
}

addDeliveryFields();