const pool = require("./db");

async function createOrdersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT NOT NULL,
        customer_city VARCHAR(100) NOT NULL,
        customer_state VARCHAR(100) NOT NULL,
        total_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(255) NOT NULL,
        unit_price NUMERIC(12, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        subtotal NUMERIC(12, 2) NOT NULL
      );
    `);

    console.log("Orders tables created successfully.");
  } catch (error) {
    console.error("Create orders tables error:", error);
  } finally {
    await pool.end();
  }
}

createOrdersTable();