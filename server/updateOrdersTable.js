const pool = require("./db");

async function updateOrdersTable() {
  try {
    await pool.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'pending';
    `);

    await pool.query(`
      UPDATE orders
      SET payment_status = 'paid'
      WHERE payment_status = 'pending';
    `);

    console.log("Orders table updated successfully.");
  } catch (error) {
    console.error("Update orders table error:", error);
  } finally {
    await pool.end();
  }
}

updateOrdersTable();