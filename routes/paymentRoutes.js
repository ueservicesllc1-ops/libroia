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
 * POST /api/payments/create-subscription-session
 * Crea sesión de suscripción PRO (mensual o anual)
 */
router.post("/create-subscription-session", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.userId || 1;
    const interval = req.body?.interval === "year" ? "year" : "month";
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (user.plan === "pro") return res.json({ error: "Ya tienes el plan PRO" });

    const monthlyPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;
    const selectedPriceId = interval === "year" ? yearlyPriceId : monthlyPriceId;

    const lineItem = selectedPriceId
      ? { price: selectedPriceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: {
              name: "LibroAI PRO",
              description: "Proyectos ilimitados · 3M tokens/mes · Publicar · PDF · Portadas · Revisión IA",
            },
            unit_amount: interval === "year" ? 9590 : 999,
            recurring: { interval },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [lineItem],
      metadata: {
        user_id: userId.toString(),
        plan: "pro",
        billing_interval: interval,
      },
      customer_email: user.email,
      success_url: `${process.env.APP_BASE_URL}/libroia/app.html?pro_success=1`,
      cancel_url: `${process.env.APP_BASE_URL}/libroia/app.html`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe] Subscription Error:", error.message);
    res.status(500).json({ error: "Error al crear la sesión de pago" });
  }
});

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

    // ── Suscripción PRO ─────────────────────────────────────────────────
    if (meta && meta.plan === 'pro' && meta.user_id) {
      try {
        const userId = parseInt(meta.user_id);
        const cycleEnd = new Date();
        if (meta.billing_interval === "year") {
          cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
        } else {
          cycleEnd.setMonth(cycleEnd.getMonth() + 1);
        }
        db.prepare(`
          UPDATE users SET
            plan = 'pro',
            included_tokens_limit = 3000000,
            subscription_status = 'active',
            billing_cycle_end = ?,
            updated_at = ?
          WHERE id = ?
        `).run(cycleEnd.toISOString(), now, userId);
        console.log(`[Webhook] ✅ Usuario ${userId} actualizado a PRO`);
      } catch (err) {
        console.error("[Webhook] ❌ Error al actualizar plan PRO:", err.message);
      }
      return res.json({ received: true });
    }

    // ── Compra de libro ─────────────────────────────────────────────────
    try {
      // Validar metadata antes de procesar
      const buyer_id = parseInt(meta?.buyer_id);
      const seller_id = parseInt(meta?.author_id);
      const amount_total = session.amount_total;
      const platform_fee = parseInt(meta?.platform_fee);
      const seller_amount = parseInt(meta?.author_amount);
      const book_id = meta?.book_id;

      // Guardar en log si la metadata está incompleta
      if (!book_id || isNaN(buyer_id) || isNaN(seller_id) || isNaN(platform_fee) || isNaN(seller_amount)) {
        console.error("[Webhook] ⚠️ Metadata incompleta o inválida:", {
          book_id, buyer_id, seller_id, platform_fee, seller_amount,
          raw_meta: meta,
        });
        // Retornar 200 para que Stripe no reintente — no se puede procesar sin metadata válida
        return res.json({ received: true, warning: "metadata_invalid" });
      }

      db.transaction(() => {
        // IDEMPOTENCIA
        const exists = db.prepare("SELECT id FROM purchases WHERE stripe_session_id = ?").get(session.id);
        if (exists) return;

        // 1. Guardar compra
        const purchase = db.prepare(`
          INSERT INTO purchases (
            user_id, book_id, stripe_session_id, stripe_payment_intent_id,
            amount_total, platform_fee_amount, author_amount, currency, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          buyer_id, book_id, session.id, session.payment_intent,
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
          seller_id, book_id, purchase.lastInsertRowid,
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
      console.log(`[Webhook] ✅ Compra y balance procesados: Libro ${book_id}`);
    } catch (err) {
      console.error("[Webhook] ❌ Error fatal en DB:", err.message);
    }
  }

  res.json({ received: true });
});

module.exports = router;
