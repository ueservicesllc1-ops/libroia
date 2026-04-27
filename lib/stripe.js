const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("ADVERTENCIA: STRIPE_SECRET_KEY no está configurada en .env");
}

module.exports = stripe;
