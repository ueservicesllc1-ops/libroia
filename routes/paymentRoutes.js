const express = require("express");
const router = express.Router();
const stripe = require("../lib/stripe");
const { getDb } = require("../lib/billing/db");

const ensureAuth = (req, res, next) => {
  if (!req.session.userId && !process.env.SKIP_AUTH) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

/**
 * POST /api/payments/create-checkout-session
 */
router.post("/create-checkout-session", ensureAuth, async (req, res) => {
  try {
    const { book_id } = req.body;
    const userId = req.session.userId || 1;
    const db = getDb();

    // 1. Buscar libro y validar estado
    const book = db.prepare("SELECT * FROM books_public WHERE id = ?").get(book_id);
    if (!book) return res.status(404).json({ error: "Libro no encontrado" });
    if (!book.is_published) return res.status(400).json({ error: "Este libro aún no está publicado" });

    // 2. Seguridad: Impedir que el autor se compre su propio libro
    if (book.author_id === userId) {
      return res.json({ url: `/reader.html?id=${book.id}`, message: "Eres el autor, acceso gratuito concedido." });
    }

    // 3. Verificar acceso previo
    const existing = db.prepare(`
      SELECT status FROM purchases 
      WHERE user_id = ? AND book_id = ? AND (status = 'paid' OR status = 'free')
    `).get(userId, book_id);
    if (existing) {
      return res.json({ url: `/reader.html?id=${book.id}` });
    }

    // 4. Si es gratis
    if (book.price <= 0) {
      db.prepare("INSERT INTO purchases (user_id, book_id, status, created_at) VALUES (?, ?, ?, ?)")
        .run(userId, book_id, 'free', new Date().toISOString());
      return res.json({ url: `/reader.html?id=${book.id}` });
    }

    // 5. Crear Sesión de Checkout con Metadata Blindada
    const commissionPercent = parseInt(process.env.PLATFORM_COMMISSION_PERCENT || "20");
    const amountTotal = Math.round(book.price * 100);
    const platformFee = Math.round(amountTotal * (commissionPercent / 100));
    const authorAmount = amountTotal - platformFee;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: book.title,
            description: `Publicado por LibroAI`,
          },
          unit_amount: amountTotal, // Precio forzado desde DB
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: {
        book_id: book.id,
        buyer_id: userId,
        author_id: book.author_id,
        platform_fee: platformFee.toString(),
        author_amount: authorAmount.toString()
      },
      success_url: `${process.env.APP_BASE_URL}/libroia/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/libroia/marketplace-detail.html?slug=${book.slug}`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe] Checkout Error:", error.message);
    res.status(500).json({ error: "Error al procesar el pago" });
  }
});

/**
 * GET /api/payments/session-status/:session_id
 */
router.get("/session-status/:session_id", async (req, res) => {
  try {
    const db = getDb();
    const purchase = db.prepare("SELECT status FROM purchases WHERE stripe_session_id = ?").get(req.params.session_id);
    if (purchase) {
      return res.json({ status: purchase.status });
    }
    res.json({ status: "pending" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/webhook
 * Manejo de eventos con IDEMPOTENCIA
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`[Webhook] ❌ Error de firma: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata;
    const db = getDb();
    const now = new Date().toISOString();

    try {
      db.transaction(() => {
        // IDEMPOTENCIA
        const exists = db.prepare("SELECT id FROM purchases WHERE stripe_session_id = ?").get(session.id);
        if (exists) return;

        const buyer_id = parseInt(meta.buyer_id);
        const seller_id = parseInt(meta.author_id);
        const amount_total = session.amount_total;
        const platform_fee = parseInt(meta.platform_fee);
        const seller_amount = parseInt(meta.author_amount);

        // 1. Guardar compra
        const purchase = db.prepare(`
          INSERT INTO purchases (
            user_id, book_id, stripe_session_id, stripe_payment_intent_id,
            amount_total, platform_fee_amount, author_amount, currency, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          buyer_id, meta.book_id, session.id, session.payment_intent,
          amount_total, platform_fee, seller_amount,
          session.currency, 'paid', now
        );

        // 2. Registrar venta
        db.prepare(`
          INSERT INTO sales (
            seller_id, book_id, purchase_id,
            amount_total, platform_fee_amount, seller_amount, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          seller_id, meta.book_id, purchase.lastInsertRowid,
          amount_total, platform_fee, seller_amount, 'paid', now
        );

        // 3. Actualizar balance del vendedor
        db.prepare(`
          UPDATE seller_balances 
          SET available_balance = available_balance + ?,
              lifetime_earnings = lifetime_earnings + ?,
              updated_at = ?
          WHERE seller_id = ?
        `).run(seller_amount, seller_amount, now, seller_id);
      })();
      console.log(`[Webhook] ✅ Compra y balance procesados: Libro ${meta.book_id}`);
    } catch (err) {
      console.error("[Webhook] ❌ Error fatal en DB:", err.message);
    }
  }

  res.json({ received: true });
});

module.exports = router;
