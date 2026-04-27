const express = require("express");
const { getDb } = require("../lib/billing/db");
const { resetBillingCycleIfNeeded } = require("../lib/billing/cycleService");
const {
  canUseIncludedModel,
  canUseSonnet,
  recordIncludedModelUsage,
  recordSonnetUsage,
  calculateSonnetCharge,
  estimateMaxSonnetChargeUsd,
  buildUsagePayload,
} = require("../lib/billing/usageService");
const { buildWritingPrompt, buildRefinePrompt, estimatePromptTokens } = require("../lib/prompts");
const { callAnthropicMessages } = require("../lib/anthropicClient");
const { requireAuth, getUserId, isBillingRelaxed } = require("../middleware/requireAuth");

const router = express.Router();

const REQUEST_TYPES = new Set(["outline", "chapter", "rewrite", "summary", "ideas", "auto"]);

function getAnthropicConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  const draftModel = process.env.ANTHROPIC_DRAFT_MODEL || "claude-haiku-4-5-20251001";
  const refineModel = process.env.ANTHROPIC_REFINE_MODEL || "claude-sonnet-4-5-20250929";
  const timeoutMs = (() => {
    const n = Number(process.env.ANTHROPIC_API_TIMEOUT_MS);
    const ms = Number.isFinite(n) && n > 0 ? n : 120_000;
    return Math.min(Math.max(ms, 30_000), 600_000);
  })();
  const maxDraft = (() => {
    const n = Number(process.env.ANTHROPIC_MAX_TOKENS_DRAFT);
    const v = Number.isFinite(n) && n > 0 ? n : 2048;
    return Math.min(Math.max(v, 256), 8192);
  })();
  const maxRefine = (() => {
    const n = Number(process.env.ANTHROPIC_MAX_TOKENS_REFINE);
    const v = Number.isFinite(n) && n > 0 ? n : 4096;
    return Math.min(Math.max(v, 256), 8192);
  })();
  return { apiKey, draftModel, refineModel, timeoutMs, maxDraft, maxRefine };
}

/**
 * Cuerpo comun: prompt + contexto libro/capitulo.
 */
function buildUserPayload(prompt, chapterText, bookTitle, genre, authorName, synopsis) {
  const p = String(prompt || "").trim();
  const c = chapterText != null ? String(chapterText) : "";
  const t = bookTitle != null ? String(bookTitle) : "";
  const g = genre != null ? String(genre) : "";
  const a = authorName != null ? String(authorName) : "";
  const s = synopsis != null ? String(synopsis) : "";
  return { prompt: p, chapterText: c, bookTitle: t, genre: g, authorName: a, synopsis: s };
}

router.post("/estimate-cost", requireAuth, (req, res) => {
  const cfg = getAnthropicConfig();
  if (!cfg.apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY no configurada." });

  const { prompt, modelMode, chapterText, bookTitle, genre, authorName, synopsis } = req.body || {};
  const { prompt: p, chapterText: c, bookTitle: t, genre: g, authorName: a, synopsis: s } = buildUserPayload(prompt, chapterText, bookTitle, genre, authorName, synopsis);
  if (!p) return res.status(400).json({ error: "prompt es obligatorio." });

  if (modelMode === "sonnet") {
    const system =
      "Eres un editor senior de narrativa en espanol. Das feedback accionable y ejemplos breves cuando ayudan.";
    const userText = buildRefinePrompt(p, c, t, g, a, "ideas", s);
    const estIn = Math.ceil(((system || "").length + userText.length) / 3) + 512;
    const estOut = cfg.maxRefine;
    const charge = calculateSonnetCharge(estIn, estOut);
    const worst = estimateMaxSonnetChargeUsd(system, userText, cfg.maxRefine);
    return res.json({
      modelMode: "sonnet",
      estimated_input_tokens: estIn,
      estimated_output_tokens_max: estOut,
      estimated_charge_usd_max: Math.round(worst * 1e6) / 1e6,
      estimated_charge_usd_linear: Math.round(charge.totalCharge * 1e6) / 1e6,
      pricing: {
        input_per_1m_usd: 6,
        output_per_1m_usd: 30,
      },
    });
  }

  const system =
    "Eres un asistente de escritura creativa en espanol: ideas, estructura y mejoras de borrador.";
  const userText = buildWritingPrompt(p, c, t, g, a, "ideas", s);
  const est = estimatePromptTokens(system, userText, cfg.maxDraft);
  return res.json({
    modelMode: "included",
    estimated_total_tokens: est,
    note: "Los tokens incluidos no tienen cargo USD adicional; se descuentan del cupo mensual.",
  });
});

router.post("/generate", requireAuth, async (req, res) => {
  const cfg = getAnthropicConfig();
  if (!cfg.apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY no configurada." });

  const { prompt, modelMode, requestType, chapterText, bookTitle, genre, authorName, synopsis } = req.body || {};
  const { prompt: p, chapterText: c, bookTitle: t, genre: g, authorName: a, synopsis: s } = buildUserPayload(prompt, chapterText, bookTitle, genre, authorName, synopsis);
  if (!p) return res.status(400).json({ error: "prompt es obligatorio." });
  const mode = modelMode === "sonnet" ? "sonnet" : "included";
  const rt = String(requestType || "ideas").toLowerCase();
  if (!REQUEST_TYPES.has(rt)) {
    return res.status(400).json({ error: `requestType invalido. Usa: ${[...REQUEST_TYPES].join(", ")}` });
  }

  const db = getDb();
  const uid = getUserId(req);
  const relaxed = isBillingRelaxed();
  let user = resetBillingCycleIfNeeded(db, uid);
  if (!relaxed && !user) return res.status(404).json({ error: "Usuario no encontrado." });

  try {
    if (mode === "included") {
      const system =
        "Eres un asistente de escritura creativa en espanol: ideas, estructura y mejoras de borrador.";
      const userText = buildWritingPrompt(p, c, t, g, a, rt, s);
      const estTokens = estimatePromptTokens(system, userText, cfg.maxDraft);
      if (!relaxed && user) {
        const gate = canUseIncludedModel(user, estTokens);
        if (!gate.allowed) {
          return res.status(403).json({ error: gate.message, reason: gate.reason });
        }
      }

      const estimated_charge_usd_before = 0;
      const estimated_tokens_before = estTokens;

      const out = await callAnthropicMessages({
        apiKey: cfg.apiKey,
        model: cfg.draftModel,
        system,
        userText,
        maxTokens: cfg.maxDraft,
        timeoutMs: cfg.timeoutMs,
      });

      if (!out.text) {
        return res.status(502).json({ error: "Respuesta vacia del modelo incluido." });
      }

      if (!relaxed) {
        recordIncludedModelUsage(db, uid, out.inputTokens, out.outputTokens, cfg.draftModel, rt);
      }

      user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
      const lim = Number(user?.included_tokens_limit) || 3_000_000;
      const used = Number(user?.included_tokens_used) || 0;
      const pct = lim > 0 ? (used / lim) * 100 : 0;

      return res.json({
        text: out.text,
        modelMode: "included",
        modelName: cfg.draftModel,
        requestType: rt,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        totalTokens: out.inputTokens + out.outputTokens,
        estimated_tokens_before: estimated_tokens_before,
        estimated_charge_usd_before: estimated_charge_usd_before,
        userChargeUsd: 0,
        providerCostUsd: 0,
        profitUsd: 0,
        usage: relaxed || !user ? null : buildUsagePayload(user),
        billingRelaxed: relaxed,
        usageRecorded: !relaxed,
        alerts: relaxed
          ? { included_over_80_percent: false, included_over_100_percent: false }
          : {
              included_over_80_percent: pct >= 80,
              included_over_100_percent: pct >= 100,
            },
      });
    }

    const system =
      "Eres un editor senior de narrativa en espanol. Das feedback accionable y ejemplos breves cuando ayudan.";
    const userText = buildRefinePrompt(p, c, t, g, a, rt, s);
    const estCharge = estimateMaxSonnetChargeUsd(system, userText, cfg.maxRefine);
    if (!relaxed && user) {
      const gate = canUseSonnet(user, estCharge);
      if (!gate.allowed) {
        const code = gate.reason === "SONNET_PAYG_DISABLED" ? 402 : 403;
        return res.status(code).json({ error: gate.message, reason: gate.reason });
      }
    }

    const out = await callAnthropicMessages({
      apiKey: cfg.apiKey,
      model: cfg.refineModel,
      system,
      userText,
      maxTokens: cfg.maxRefine,
      timeoutMs: cfg.timeoutMs,
    });

    if (!out.text) {
      return res.status(502).json({ error: "Respuesta vacia de Sonnet PRO." });
    }

    const bill = calculateSonnetCharge(out.inputTokens, out.outputTokens);
    if (!relaxed) {
      recordSonnetUsage(db, uid, out.inputTokens, out.outputTokens, cfg.refineModel, rt);
    }

    user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);

    return res.json({
      text: out.text,
      modelMode: "sonnet",
      modelName: cfg.refineModel,
      requestType: rt,
      inputTokens: out.inputTokens,
      outputTokens: out.outputTokens,
      totalTokens: out.inputTokens + out.outputTokens,
      estimated_charge_usd_before: Math.round(estCharge * 1e6) / 1e6,
      userChargeUsd: Math.round(bill.totalCharge * 1e6) / 1e6,
      providerCostUsd: Math.round(bill.providerCost * 1e6) / 1e6,
      profitUsd: Math.round(bill.profit * 1e6) / 1e6,
      usage: relaxed || !user ? null : buildUsagePayload(user),
      billingRelaxed: relaxed,
      usageRecorded: !relaxed,
    });
  } catch (e) {
    console.error("[ai/generate]", e);
    return res.status(502).json({ error: e.message || "Error al llamar a Anthropic." });
  }
});

module.exports = router;
