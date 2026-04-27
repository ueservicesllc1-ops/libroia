const express = require("express");
const router = express.Router();
const { getDb } = require("../lib/billing/db");
const { requireAdmin } = require("../middleware/requireAuth");

/**
 * GET /api/admin/dashboard
 */
router.get("/dashboard", requireAdmin, (req, res) => {
  try {
    const db = getDb();
    
    const stats = {
      users: db.prepare("SELECT COUNT(*) as c FROM users").get().c,
      books: db.prepare("SELECT COUNT(*) as c FROM books_public").get().c,
      sales: db.prepare("SELECT SUM(amount_total) as gross, SUM(platform_fee_amount) as net FROM sales").get(),
      pending_payouts: db.prepare("SELECT SUM(amount) as s FROM seller_payouts WHERE status = 'pending'").get().s || 0,
      pending_sellers: db.prepare("SELECT COUNT(*) as c FROM seller_profiles WHERE status = 'pending'").get().c
    };

    const recentSales = db.prepare(`
      SELECT s.*, b.title as book_title, u.email as seller_email
      FROM sales s
      JOIN books_public b ON s.book_id = b.id
      JOIN users u ON s.seller_id = u.id
      ORDER BY s.created_at DESC LIMIT 10
    `).all();

    res.json({ stats, recentSales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/sellers/pending
 */
router.get("/sellers/pending", requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const sellers = db.prepare("SELECT p.*, u.email FROM seller_profiles p JOIN users u ON p.user_id = u.id WHERE p.status = 'pending'").all();
    res.json(sellers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/sellers/:id/approve
 */
router.post("/sellers/:id/approve", requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    db.transaction(() => {
      db.prepare("UPDATE seller_profiles SET status = 'approved', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      const profile = db.prepare("SELECT user_id FROM seller_profiles WHERE id = ?").get(id);
      db.prepare("UPDATE users SET is_seller = 1 WHERE id = ?").run(profile.user_id);
    })();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sellers/:id/reject", requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE seller_profiles SET status = 'rejected', updated_at = ? WHERE id = ?").run(new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/payouts
 */
router.get("/payouts", requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const payouts = db.prepare(`
      SELECT p.*, u.email as seller_email, pr.payout_method, pr.payout_email
      FROM seller_payouts p
      JOIN users u ON p.seller_id = u.id
      JOIN seller_profiles pr ON u.id = pr.user_id
      ORDER BY p.created_at DESC
    `).all();
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/payouts/:id/mark-paid
 */
router.post("/payouts/:id/mark-paid", requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE seller_payouts SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
