const express = require("express");
const router = express.Router();

router.post("/webhook", (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).send("STRIPE_WEBHOOK_SECRET no configurado");
  }
  res.status(501).send("Stripe webhook pendiente de implementar (constructEvent + idempotencia).");
});

module.exports = router;
