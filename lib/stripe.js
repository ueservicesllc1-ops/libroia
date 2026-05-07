const Stripe = require("stripe");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.warn("ADVERTENCIA: STRIPE_SECRET_KEY no configurada. Las funciones de pago fallarán.");
}

const stripe = new Stripe(key || "dummy_key", {
  apiVersion: "2023-10-16", // Versión estable
});

module.exports = stripe;
