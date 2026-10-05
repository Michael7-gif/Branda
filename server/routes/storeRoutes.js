const express = require("express");

const router = express.Router();

console.log("STORE ROUTES LOADED");

router.get("/", (req, res) => {
console.log("STORE ROUTE HIT");
console.log("SLUG:", req.params.slug);

res.json({
success: true,
message: "Store route is working.",
slug: req.params.slug,
});
});

module.exports = router;