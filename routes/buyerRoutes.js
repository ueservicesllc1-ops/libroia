const express = require("express");
const router = express.Router();
const { getDb } = require("../lib/billing/db");
const { requireAuth, getUserId } = require("../middleware/requireAuth");

/**
 * GET /api/buyer/library
 * Libros comprados o gratuitos guardados
 */
router.get("/library", requireAuth, (req, res) => {
  try {
    const db = getDb();
    const uid = getUserId(req);

    // Libros comprados (pago confirmado)
    const purchased = db.prepare(`
      SELECT b.*, p.created_at as purchase_date,
        (SELECT progress FROM reading_progress WHERE user_id = ? AND book_id = b.id) as progress
      FROM books_public b
      JOIN purchases p ON b.id = p.book_id
      WHERE p.user_id = ? AND p.status = 'paid'
    `).all(uid, uid);

    // Libros gratis (donde el usuario es el comprador de un item con precio 0, 
    // o simplemente libros que ha guardado/interactuado si implementamos "guardar")
    // Por ahora, solo los que tienen una entrada en purchases
    
    res.json(purchased);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/buyer/progress
 */
router.post("/progress", requireAuth, (req, res) => {
  try {
    const db = getDb();
    const uid = getUserId(req);
    const { book_id, progress } = req.body;

    db.prepare(`
      INSERT INTO reading_progress (user_id, book_id, progress, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        progress = excluded.progress,
        updated_at = excluded.updated_at
    `).run(uid, book_id, progress, new Date().toISOString());

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
