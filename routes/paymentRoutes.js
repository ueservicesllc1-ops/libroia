const express = require("express");
const router = express.Router();
const stripe = require("../lib/stripe");
const { getDb } = require("../lib/billing/db");
const PLATFORM_COMMISSION_PERCENT = parseInt(process.env.PLATFORM_COMMISSION_PERCENT || "20", 10);

const ensureAuth = (req, res, next) => {
  if (!req.session.userId && !process.env.SKIP_AUTH) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

function buildBookSettlement(book) {
  const amountTotal = Math.max(0, Math.round(Number(book.price) || 0)); // cents in DB
  const platformFee = Math.round(amountTotal * (PLATFORM_COMMISSION_PERCENT / 100));
  const authorAmount = amountTotal - platformFee;
  return { amountTotal, platformFee, authorAmount };
}

function parseCartItems(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((i) => ({
        book_id: i.book_id,
        seller_id: Number(i.seller_id),
        amount_total: Number(i.amount_total),
        platform_fee: Number(i.platform_fee),
        seller_amount: Number(i.seller_amount),
      }))
      .filter((i) => i.book_id && Number.isFinite(i.seller_id) && Number.isFinite(i.amount_total) && Number.isFinite(i.platform_fee) && Number.isFinite(i.seller_amount));
  } catch {
    return null;
  }
}

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
    const { amountTotal, platformFee, authorAmount } = buildBookSettlement(book);

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
 * POST /api/payments/create-cart-checkout-session
 * Crea una sesión Stripe con múltiples libros PDF.
 */
router.post("/create-cart-checkout-session", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.userId || 1;
    const db = getDb();
    const ids = Array.isArray(req.body?.book_ids) ? req.body.book_ids : [];
    const uniqueBookIds = [...new Set(ids.map((x) => String(x || "").trim()).filter(Boolean))];
    if (!uniqueBookIds.length) {
      return res.status(400).json({ error: "Carrito vacío." });
    }

    const selectedBooks = [];
    for (const bookId of uniqueBookIds) {
      const book = db.prepare("SELECT * FROM books_public WHERE id = ?").get(bookId);
      if (!book || !book.is_published || Number(book.price) <= 0) continue;
      if (book.author_id === userId) continue;
      const existing = db.prepare(`
        SELECT status FROM purchases
        WHERE user_id = ? AND book_id = ? AND (status = 'paid' OR status = 'free')
      `).get(userId, bookId);
      if (existing) continue;
      selectedBooks.push(book);
    }

    if (!selectedBooks.length) {
      return res.status(400).json({ error: "No hay libros válidos en el carrito para cobrar." });
    }

    const lineItems = [];
    const cartItemsMeta = [];
    for (const book of selectedBooks) {
      const settlement = buildBookSettlement(book);
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: book.title,
            description: "Libro digital (PDF) - Marketplace LibroAI",
          },
          unit_amount: settlement.amountTotal,
        },
        quantity: 1,
      });
      cartItemsMeta.push({
        book_id: book.id,
        seller_id: Number(book.author_id),
        amount_total: settlement.amountTotal,
        platform_fee: settlement.platformFee,
        seller_amount: settlement.authorAmount,
      });
    }

    const cartItemsRaw = JSON.stringify(cartItemsMeta);
    if (cartItemsRaw.length > 500) {
      return res.status(400).json({ error: "Carrito demasiado grande para checkout único. Divide tu compra en dos pagos." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      metadata: {
        buyer_id: String(userId),
        cart_items: cartItemsRaw,
      },
      success_url: `${process.env.APP_BASE_URL}/libroia/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/libroia/marketplace.html`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe] Cart Checkout Error:", error.message);
    res.status(500).json({ error: "Error al procesar el checkout del carrito." });
  }
});

/**
 * POST /api/payments/create-physical-checkout-session
 * Pedido físico: libros + envío único; Stripe recoge dirección de envío.
 */
router.post("/create-physical-checkout-session", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.userId || 1;
    const db = getDb();
    const ids = Array.isArray(req.body?.book_ids) ? req.body.book_ids : [];
    const uniqueBookIds = [...new Set(ids.map((x) => String(x || "").trim()).filter(Boolean))];
    if (!uniqueBookIds.length) {
      return res.status(400).json({ error: "Selecciona al menos un libro físico." });
    }

    const shippingCents = Math.max(
      0,
      parseInt(process.env.PHYSICAL_SHIPPING_FLAT_CENTS || "999", 10)
    );

    const selectedBooks = [];
    for (const bookId of uniqueBookIds) {
      const book = db.prepare("SELECT * FROM books_public WHERE id = ?").get(bookId);
      if (!book || !book.is_published || Number(book.price) <= 0) continue;
      if (book.author_id === userId) continue;
      selectedBooks.push(book);
    }

    if (!selectedBooks.length) {
      return res.status(400).json({ error: "No hay libros válidos para pedido físico." });
    }

    const lineItems = [];
    const cartItemsMeta = [];
    for (const book of selectedBooks) {
      const settlement = buildBookSettlement(book);
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${book.title} (edición impresa)`,
            description: "Libro físico — Marketplace LibroAI",
          },
          unit_amount: settlement.amountTotal,
        },
        quantity: 1,
      });
      cartItemsMeta.push({
        book_id: book.id,
        seller_id: Number(book.author_id),
        amount_total: settlement.amountTotal,
        platform_fee: settlement.platformFee,
        seller_amount: settlement.authorAmount,
      });
    }

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Envío impresión (un solo cargo por pedido)",
          description: "Preparación y envío del pedido físico",
        },
        unit_amount: shippingCents,
      },
      quantity: 1,
    });

    const physicalCartRaw = JSON.stringify(cartItemsMeta);
    if (physicalCartRaw.length > 500) {
      return res.status(400).json({ error: "Pedido demasiado grande. Divide en dos compras." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: [
          "US", "MX", "ES", "CO", "AR", "CL", "PE", "EC", "GT", "CR", "PA", "DO", "PR",
        ],
      },
      metadata: {
        purchase_kind: "physical",
        buyer_id: String(userId),
        physical_cart: physicalCartRaw,
        shipping_cents: String(shippingCents),
      },
      success_url: `${process.env.APP_BASE_URL}/libroia/payment-success.html?session_id={CHECKOUT_SESSION_ID}&kind=physical`,
      cancel_url: `${process.env.APP_BASE_URL}/libroia/marketplace.html`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe] Physical Checkout Error:", error.message);
    res.status(500).json({ error: "Error al crear el pedido físico." });
  }
});

/**
 * GET /api/payments/session-status/:session_id
 */
router.get("/session-status/:session_id", async (req, res) => {
  try {
    const db = getDb();
    const sid = req.params.session_id;
    const purchases = db.prepare("SELECT status, book_id FROM purchases WHERE stripe_session_id = ?").all(sid);
    let paidBookIds = [];
    let status = "pending";
    if (purchases && purchases.length) {
      paidBookIds = purchases.filter((p) => p.status === "paid").map((p) => p.book_id);
      status = paidBookIds.length ? "paid" : purchases[0].status;
    }

    const physOrder = db.prepare("SELECT id FROM physical_orders WHERE stripe_session_id = ?").get(sid);
    let physicalBookIds = [];
    if (physOrder) {
      physicalBookIds = db
        .prepare("SELECT book_id FROM physical_order_lines WHERE order_id = ?")
        .all(physOrder.id)
        .map((r) => r.book_id);
      if (physicalBookIds.length) status = "paid";
    }

    return res.json({ status, paid_book_ids: paidBookIds, physical_book_ids: physicalBookIds });
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

    // ── Pedido físico (Stripe Checkout + envío) ─────────────────────────
    if (meta && meta.purchase_kind === "physical" && meta.buyer_id && meta.physical_cart) {
      try {
        const buyerId = parseInt(meta.buyer_id, 10);
        const cartItems = parseCartItems(meta.physical_cart);
        const shippingCents = Math.max(0, parseInt(meta.shipping_cents || "0", 10));
        if (!Number.isFinite(buyerId) || !cartItems || !cartItems.length) {
          console.error("[Webhook] physical: metadata inválida", meta);
          return res.json({ received: true, warning: "physical_metadata_invalid" });
        }
        const booksSum = cartItems.reduce((s, i) => s + i.amount_total, 0);
        const expectedTotal = booksSum + shippingCents;
        if (Number(session.amount_total) !== expectedTotal) {
          console.error("[Webhook] physical: monto no coincide", session.amount_total, expectedTotal);
          return res.json({ received: true, warning: "physical_amount_mismatch" });
        }
        const dup = db.prepare("SELECT id FROM physical_orders WHERE stripe_session_id = ?").get(session.id);
        if (dup) return res.json({ received: true });

        const shippingSnap =
          session.shipping_details != null
            ? JSON.stringify(session.shipping_details)
            : JSON.stringify(session.customer_details || {});

        db.transaction(() => {
          const orderResult = db
            .prepare(
              `INSERT INTO physical_orders (
              user_id, stripe_session_id, stripe_payment_intent_id,
              amount_total, shipping_cents, currency, status, shipping_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              buyerId,
              session.id,
              session.payment_intent || null,
              Number(session.amount_total),
              shippingCents,
              session.currency || "usd",
              "paid",
              shippingSnap,
              now
            );
          const orderId = orderResult.lastInsertRowid;
          const lineIns = db.prepare(
            `INSERT INTO physical_order_lines (
            order_id, book_id, seller_id, title, amount_total, platform_fee_amount, seller_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
          );
          for (const item of cartItems) {
            const book = db.prepare("SELECT title FROM books_public WHERE id = ?").get(item.book_id);
            lineIns.run(
              orderId,
              item.book_id,
              item.seller_id,
              book?.title || "",
              item.amount_total,
              item.platform_fee,
              item.seller_amount
            );
            db.prepare(
              `INSERT INTO seller_balances (seller_id, available_balance, lifetime_earnings, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(seller_id) DO UPDATE SET
                 available_balance = available_balance + excluded.available_balance,
                 lifetime_earnings = lifetime_earnings + excluded.lifetime_earnings,
                 updated_at = excluded.updated_at`
            ).run(item.seller_id, item.seller_amount, item.seller_amount, now);
          }
        })();
        console.log(`[Webhook] pedido físico OK sesión ${session.id}`);
      } catch (err) {
        console.error("[Webhook] physical DB:", err.message);
      }
      return res.json({ received: true });
    }

    // ── Compra de libro (PDF / carrito digital) ─────────────────────────
    try {
      const buyer_id = parseInt(meta?.buyer_id);
      const cartItems = parseCartItems(meta?.cart_items);
      const singleBookId = meta?.book_id;
      const singleSellerId = parseInt(meta?.author_id);
      const singlePlatformFee = parseInt(meta?.platform_fee);
      const singleSellerAmount = parseInt(meta?.author_amount);

      const itemsToProcess = cartItems?.length
        ? cartItems
        : (singleBookId && Number.isFinite(singleSellerId) && Number.isFinite(singlePlatformFee) && Number.isFinite(singleSellerAmount))
          ? [{
              book_id: singleBookId,
              seller_id: singleSellerId,
              amount_total: Number(session.amount_total),
              platform_fee: singlePlatformFee,
              seller_amount: singleSellerAmount,
            }]
          : [];

      if (!Number.isFinite(buyer_id) || !itemsToProcess.length) {
        console.error("[Webhook] ⚠️ Metadata incompleta o inválida:", {
          buyer_id,
          raw_meta: meta,
        });
        // Retornar 200 para que Stripe no reintente — no se puede procesar sin metadata válida
        return res.json({ received: true, warning: "metadata_invalid" });
      }

      db.transaction(() => {
        for (const item of itemsToProcess) {
          // IDEMPOTENCIA por libro/sesión
          const exists = db.prepare("SELECT id FROM purchases WHERE stripe_session_id = ? AND book_id = ?").get(session.id, item.book_id);
          if (exists) continue;

          const purchase = db.prepare(`
            INSERT INTO purchases (
              user_id, book_id, stripe_session_id, stripe_payment_intent_id,
              amount_total, platform_fee_amount, author_amount, currency, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            buyer_id, item.book_id, session.id, session.payment_intent,
            item.amount_total, item.platform_fee, item.seller_amount,
            session.currency, 'paid', now
          );

          db.prepare(`
            INSERT INTO sales (
              seller_id, book_id, purchase_id,
              amount_total, platform_fee_amount, seller_amount, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            item.seller_id, item.book_id, purchase.lastInsertRowid,
            item.amount_total, item.platform_fee, item.seller_amount, 'paid', now
          );

          db.prepare(`
            INSERT INTO seller_balances (seller_id, available_balance, lifetime_earnings, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(seller_id) DO UPDATE SET
              available_balance = available_balance + excluded.available_balance,
              lifetime_earnings = lifetime_earnings + excluded.lifetime_earnings,
              updated_at = excluded.updated_at
          `).run(item.seller_id, item.seller_amount, item.seller_amount, now);
        }
      })();
      console.log(`[Webhook] ✅ Compra(s) y balance procesados: ${itemsToProcess.length} item(s)`);
    } catch (err) {
      console.error("[Webhook] ❌ Error fatal en DB:", err.message);
    }
  }

  res.json({ received: true });
});

module.exports = router;
