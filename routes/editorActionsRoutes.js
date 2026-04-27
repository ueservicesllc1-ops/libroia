const express = require("express");
const router = express.Router();
const { getDb } = require("../lib/billing/db");
const prompts = require("../lib/prompts");
const { callAnthropicMessages } = require("../lib/anthropicClient");

const ensureAuth = (req, res, next) => {
  if (!req.session.userId && !process.env.SKIP_AUTH) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

const apiKey = process.env.ANTHROPIC_API_KEY;
const model = "claude-3-5-sonnet-20240620";

/**
 * POST /api/ai/revise-chapter
 */
router.post("/revise-chapter", ensureAuth, async (req, res) => {
  try {
    const { content, book_id } = req.body;
    if (!content) return res.status(400).json({ error: "Contenido vacío" });

    const out = await callAnthropicMessages({
      apiKey,
      model,
      system: "Eres un editor literario experto. Devuelve solo el texto corregido.",
      userText: prompts.reviseChapterPrompt(content),
      maxTokens: 4000,
      timeoutMs: 120000
    });

    const revised = out.text;

    // Guardar versión
    const db = getDb();
    db.prepare(`
      INSERT INTO book_versions (book_id, user_id, action_type, content_before, content_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(book_id, req.session.userId || 1, 'revise_chapter', content, revised, new Date().toISOString());

    res.json({ revised });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/organize-manuscript
 */
router.post("/organize-manuscript", ensureAuth, async (req, res) => {
  try {
    const { content, book_id } = req.body;
    if (!content) return res.status(400).json({ error: "Contenido vacío" });

    const out = await callAnthropicMessages({
      apiKey,
      model,
      system: "Eres un arquitecto editorial. Devuelve solo un JSON válido.",
      userText: prompts.organizeManuscriptPrompt(content),
      maxTokens: 8000,
      timeoutMs: 180000
    });

    let resultText = out.text;
    resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const structured = JSON.parse(resultText);

    const db = getDb();
    db.prepare(`
      INSERT INTO book_versions (book_id, user_id, action_type, content_before, content_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(book_id, req.session.userId || 1, 'organize', content, resultText, new Date().toISOString());

    res.json({ structured });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al organizar el manuscrito" });
  }
});

module.exports = router;
