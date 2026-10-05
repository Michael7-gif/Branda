const pool = require("./db");

async function updateBusinessSlug() {
try {
const businesses = await pool.query(
"SELECT id, business_name FROM businesses WHERE slug IS NULL"
);

for (const business of businesses.rows) {
  const slug = business.business_name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  await pool.query(
    "UPDATE businesses SET slug = $1 WHERE id = $2",
    [slug, business.id]
  );

  console.log(`Updated: ${business.business_name} -> ${slug}`);
}

console.log("Business slug update completed.");

} catch (error) {
console.error("Error updating business slug:", error);
} finally {
await pool.end();
}
}

updateBusinessSlug();