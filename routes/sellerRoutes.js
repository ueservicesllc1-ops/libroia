const express = require("express");
const router = express.Router();
const { getDb } = require("../lib/billing/db");
const { requireAuth, getUserId } = require("../middleware/requireAuth");

/**
 * POST /api/seller/apply
 * Usuario solicita ser vendedor
 */
router.post("/apply", requireAuth, (req, res) => {
  try {
    const db = getDb();
    const uid = getUserId(req);
    const { display_name, bio, payout_method, payout_email } = req.body;

    const now = new Date().toISOString();
    
    // Crear o actualizar perfil
    db.prepare(`
      INSERT INTO seller_profiles (user_id, display_name, bio, payout_method, payout_email, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        display_name=excluded.display_name,
        bio=excluded.bio,
        payout_method=excluded.payout_method,
        payout_email=excluded.payout_email,
        status='pending',
        updated_at=excluded.updated_at
    `).run(uid, display_name, bio, payout_method, payout_email, now, now);

    // Inicializar balance si no existe
    db.prepare(`
      INSERT OR IGNORE INTO seller_balances (seller_id, updated_at)
      VALUES (?, ?)
    `).run(uid, now);

    res.json({ success: true, message: "Solicitud enviada correctamente. Estamos revisando tu perfil." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/seller/profile
 */
router.get("/profile", requireAuth, (req, res) => {
  try {
    const db = getDb();
    const uid = getUserId(req);
    const profile = db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(uid);
    const balance = db.prepare("SELECT * FROM seller_balances WHERE seller_id = ?").get(uid);
    res.json({ profile, balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/seller/dashboard
 */
router.get("/dashboard", requireAuth, (req, res) => {
  try {
    const db = getDb();
    const uid = getUserId(req);

    const profile = db.prepare("SELECT status FROM seller_profiles WHERE user_id = ?").get(uid);
    if (!profile || profile.status !== 'approved') {
      return res.status(403).json({ error: "Perfil no aprobado", status: profile?.status || 'none' });
    }

    const balance = db.prepare("SELECT * FROM seller_balances WHERE seller_id = ?").get(uid);
    
    const salesStats = db.prepare(`
      SELECT 
        SUM(amount_total) as gross,
        SUM(platform_fee_amount) as platform_cut,
        SUM(seller_amount) as net,
        COUNT(*) as count
      FROM sales
      WHERE seller_id = ?
    `).get(uid);

    const books = db.prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM sales WHERE book_id = b.id) as sales_count
      FROM books_public b
      WHERE b.author_id = ?
    `).all(uid);

    const payouts = db.prepare(`
      SELECT * FROM seller_payouts WHERE seller_id = ? ORDER BY created_at DESC
    `).all(uid);

    res.json({
      balance,
      stats: {
        total_sales: salesStats.count || 0,
        gross: salesStats.gross || 0,
        platform_cut: salesStats.platform_cut || 0,
        net: salesStats.net || 0
      },
      books,
      payouts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/seller/request-payout
 */
router.post("/request-payout", requireAuth, (req, res) => {
  try {
    const db = getDb();
    const uid = getUserId(req);
    const { amount } = req.body; // en centavos

    const balance = db.prepare("SELECT available_balance FROM seller_balances WHERE seller_id = ?").get(uid);
    if (!balance || balance.available_balance < amount) {
      return res.status(400).json({ error: "Balance insuficiente" });
    }

    const now = new Date().toISOString();
    
    db.transaction(() => {
      // Crear solicitud
      db.prepare(`
        INSERT INTO seller_payouts (seller_id, amount, status, created_at)
        VALUES (?, ?, 'pending', ?)
      `).run(uid, amount, now);

      // Descontar del balance disponible
      db.prepare(`
        UPDATE seller_balances 
        SET available_balance = available_balance - ?, 
            updated_at = ?
        WHERE seller_id = ?
      `).run(amount, now, uid);
    })();

    res.json({ success: true, message: "Solicitud de pago enviada." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
