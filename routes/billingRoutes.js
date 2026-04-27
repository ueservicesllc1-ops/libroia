const express = require("express");
const { getDb } = require("../lib/billing/db");
const { resetBillingCycleIfNeeded } = require("../lib/billing/cycleService");
const { buildUsagePayload } = require("../lib/billing/usageService");
const { requireAuth, getUserId } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/usage", requireAuth, (req, res) => {
  const db = getDb();
  const user = resetBillingCycleIfNeeded(db, getUserId(req));
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json(buildUsagePayload(user));
});

router.put("/sonnet-payg", requireAuth, (req, res) => {
  const enabled = Boolean(req.body && req.body.enabled);
  let monthlyLimitUsd = null;
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "monthlyLimitUsd")) {
    const v = req.body.monthlyLimitUsd;
    if (v === null || v === "" || v === undefined) {
      monthlyLimitUsd = null;
    } else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: "monthlyLimitUsd invalido." });
      }
      monthlyLimitUsd = n;
    }
  }

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE users SET sonnet_payg_enabled = ?, sonnet_monthly_spend_limit = ?, updated_at = ? WHERE id = ?`
  ).run(enabled ? 1 : 0, monthlyLimitUsd, now, getUserId(req));

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(getUserId(req));
  res.json({
    ok: true,
    sonnet_payg_enabled: Boolean(user.sonnet_payg_enabled),
    sonnet_monthly_spend_limit:
      user.sonnet_monthly_spend_limit == null ? null : Number(user.sonnet_monthly_spend_limit),
  });
});

module.exports = router;
