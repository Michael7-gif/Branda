const pool = require("./db");

async function addStoreSlug() {
try {
await pool.query(`       ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS slug VARCHAR(180) UNIQUE
    `);


console.log("Store slug column added successfully.");


} catch (error) {
console.error("Error adding store slug:", error);
} finally {
await pool.end();
}
}

addStoreSlug();
