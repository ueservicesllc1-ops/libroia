// @ts-check
const C = require("./constants");
const { resetBillingCycleIfNeeded } = require("./cycleService");

/**
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
function calculateIncludedModelUsage(inputTokens, outputTokens) {
  return inputTokens + outputTokens;
}

/**
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
function calculateSonnetCharge(inputTokens, outputTokens) {
  const inputCost = (inputTokens * C.SONNET_INPUT_PRICE_PER_1M) / 1_000_000;
  const outputCost = (outputTokens * C.SONNET_OUTPUT_PRICE_PER_1M) / 1_000_000;
  const totalCharge = inputCost + outputCost;
  const providerCost =
    (inputTokens * C.SONNET_PROVIDER_INPUT_COST_PER_1M) / 1_000_000 +
    (outputTokens * C.SONNET_PROVIDER_OUTPUT_COST_PER_1M) / 1_000_000;
  const profit = totalCharge - providerCost;
  return { inputCost, outputCost, totalCharge, providerCost, profit };
}

/**
 * Cota superior aproximada del coste Sonnet (para pre-check de limite de gasto).
 * @param {string} system
 * @param {string} userText
 * @param {number} maxOutput
 */
function estimateMaxSonnetChargeUsd(system, userText, maxOutput) {
  const estIn = Math.ceil(((system || "").length + (userText || "").length) / 3) + 512;
  const estOut = maxOutput;
  return calculateSonnetCharge(estIn, estOut).totalCharge;
}

/**
 * @param {object} user fila users
 * @param {number} estimatedTokens
 */
function canUseIncludedModel(user, estimatedTokens) {
  if (!user) return { allowed: false, reason: "NO_USER", message: "Sesion invalida." };
  const st = user.subscription_status;
  if (st !== "active" && st !== "trialing") {
    return {
      allowed: false,
      reason: "SUBSCRIPTION_INACTIVE",
      message: "Tu suscripcion no esta activa. Renueva el plan para seguir usando el modelo incluido.",
    };
  }
  const used = Number(user.included_tokens_used) || 0;
  const limit = Number(user.included_tokens_limit) || C.INCLUDED_TOKENS_LIMIT;
  if (used >= limit) {
    return {
      allowed: false,
      reason: "INCLUDED_EXHAUSTED",
      message:
        "Has alcanzado los 3,000,000 tokens incluidos de tu plan mensual. Puedes esperar al proximo ciclo o usar Sonnet PRO con pago por uso.",
    };
  }
  if (used + estimatedTokens > limit) {
    return {
      allowed: false,
      reason: "INCLUDED_WOULD_EXCEED",
      message:
        "Esta peticion superaria tu cupo de tokens incluidos del mes. Acorta el contexto o espera al siguiente ciclo.",
    };
  }
  return { allowed: true, reason: null, message: null };
}

/**
 * @param {object} user
 * @param {number} estimatedChargeUsd peor caso estimado
 */
function canUseSonnet(user, estimatedChargeUsd) {
  if (!user) return { allowed: false, reason: "NO_USER", message: "Sesion invalida." };
  const st = user.subscription_status;
  if (st !== "active" && st !== "trialing") {
    return {
      allowed: false,
      reason: "SUBSCRIPTION_INACTIVE",
      message: "Tu suscripcion no esta activa.",
    };
  }
  if (!user.sonnet_payg_enabled) {
    return {
      allowed: false,
      reason: "SONNET_PAYG_DISABLED",
      message:
        "Sonnet PRO no esta incluido en tu plan. Activa pago por uso para usar este modelo premium.",
    };
  }
  const spent = Number(user.sonnet_monthly_spend_used) || 0;
  const lim = user.sonnet_monthly_spend_limit;
  if (lim != null && lim !== "" && Number.isFinite(Number(lim))) {
    const cap = Number(lim);
    if (spent + estimatedChargeUsd > cap + 1e-9) {
      return {
        allowed: false,
        reason: "SONNET_SPEND_CAP",
        message: "Superarias tu limite mensual de gasto configurado para Sonnet PRO.",
      };
    }
  }
  return { allowed: true, reason: null, message: null };
}

/**
 * @param {import("better-sqlite3").Database} db
 * @param {number} userId
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @param {string} modelName
 * @param {string} requestType
 */
function recordIncludedModelUsage(db, userId, inputTokens, outputTokens, modelName, requestType) {
  const total = calculateIncludedModelUsage(inputTokens, outputTokens);
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE users SET included_tokens_used = included_tokens_used + ?, updated_at = ? WHERE id = ?`
    ).run(total, now, userId);
    db.prepare(
      `INSERT INTO ai_usage_logs (
        user_id, model_type, model_name, input_tokens, output_tokens, total_tokens,
        provider_cost_usd, user_charge_usd, request_type, created_at
      ) VALUES (?, 'included', ?, ?, ?, ?, 0, 0, ?, ?)`
    ).run(userId, modelName, inputTokens, outputTokens, total, requestType, now);
  });
  tx();
}

/**
 * @param {import("better-sqlite3").Database} db
 * @param {number} userId
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @param {string} modelName
 * @param {string} requestType
 */
function recordSonnetUsage(db, userId, inputTokens, outputTokens, modelName, requestType) {
  const total = inputTokens + outputTokens;
  const { providerCost, totalCharge } = calculateSonnetCharge(inputTokens, outputTokens);
  const now = new Date().toISOString();
  const meta = JSON.stringify({ inputTokens, outputTokens, modelName, requestType });
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE users SET sonnet_monthly_spend_used = sonnet_monthly_spend_used + ?, updated_at = ? WHERE id = ?`
    ).run(totalCharge, now, userId);
    db.prepare(
      `INSERT INTO ai_usage_logs (
        user_id, model_type, model_name, input_tokens, output_tokens, total_tokens,
        provider_cost_usd, user_charge_usd, request_type, created_at
      ) VALUES (?, 'sonnet', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      modelName,
      inputTokens,
      outputTokens,
      total,
      providerCost,
      totalCharge,
      requestType,
      now
    );
    db.prepare(
      `INSERT INTO billing_events (user_id, type, amount_usd, description, metadata, created_at)
       VALUES (?, 'sonnet_usage', ?, 'Uso Sonnet PRO (markup 2x)', ?, ?)`
    ).run(userId, totalCharge, meta, now);
  });
  tx();
}

/**
 * Resumen de uso para API / UI
 * @param {object} user
 */
function buildUsagePayload(user) {
  const limit = Number(user.included_tokens_limit) || C.INCLUDED_TOKENS_LIMIT;
  const used = Number(user.included_tokens_used) || 0;
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  return {
    plan: user.plan || "free",
    included_tokens_limit: limit,
    included_tokens_used: used,
    included_tokens_remaining: remaining,
    included_usage_percent: Math.round(pct * 100) / 100,
    included_alert_80: pct >= C.INCLUDED_ALERT_THRESHOLD_PERCENT,
    included_blocked: used >= limit,
    sonnet_payg_enabled: Boolean(user.sonnet_payg_enabled),
    sonnet_monthly_spend_used: Number(user.sonnet_monthly_spend_used) || 0,
    sonnet_monthly_spend_limit:
      user.sonnet_monthly_spend_limit == null ? null : Number(user.sonnet_monthly_spend_limit),
    billing_cycle_end: user.billing_cycle_end,
  };
}

module.exports = {
  calculateIncludedModelUsage,
  calculateSonnetCharge,
  estimateMaxSonnetChargeUsd,
  canUseIncludedModel,
  canUseSonnet,
  recordIncludedModelUsage,
  recordSonnetUsage,
  buildUsagePayload,
};
