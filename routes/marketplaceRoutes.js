const express = require("express");
const router = express.Router();
const { getDb } = require("../lib/billing/db");

// --- Middlewares ---
const ensureAuth = (req, res, next) => {
  if (!req.session.userId && !process.env.SKIP_AUTH) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

// --- Marketplace ---

/**
 * GET /api/marketplace
 * Lista de libros publicados
 */
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const books = db.prepare(`
      SELECT 
        b.*, 
        f.cover_url, 
        u.email as author_email, u.author_name,
        (SELECT AVG(rating) FROM reviews WHERE book_id = b.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE book_id = b.id) as review_count
      FROM books_public b
      LEFT JOIN book_files f ON b.id = f.book_id
      LEFT JOIN users u ON b.author_id = u.id
      WHERE b.is_published = 1
      ORDER BY b.created_at DESC
    `).all();

    // Registrar evento de vista general (Marketplace View)
    // No bloqueamos la respuesta por esto
    db.prepare("INSERT INTO book_events (book_id, user_id, event_type, created_at) VALUES (?, ?, ?, ?)")
      .run("all", req.session.userId || null, "marketplace_view", new Date().toISOString());

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/:slug
 * Detalle del libro con analíticas
 */
router.get("/book/:slug", (req, res) => {
  try {
    const db = getDb();
    const book = db.prepare(`
      SELECT 
        b.*, f.cover_url, f.pdf_url, f.epub_url, f.sample_url,
        u.email as author_email, u.author_name, u.bio as author_bio, u.avatar_url as author_avatar,
        (SELECT AVG(rating) FROM reviews WHERE book_id = b.id) as avg_rating
      FROM books_public b
      LEFT JOIN book_files f ON b.id = f.book_id
      LEFT JOIN users u ON b.author_id = u.id
      WHERE b.slug = ?
    `).get(req.params.slug);

    if (!book) return res.status(404).json({ error: "Libro no encontrado" });

    // Registrar evento de detalle
    db.prepare("INSERT INTO book_events (book_id, user_id, event_type, created_at) VALUES (?, ?, ?, ?)")
      .run(book.id, req.session.userId || null, "book_detail_view", new Date().toISOString());

    // Obtener reseñas
    const reviews = db.prepare(`
      SELECT r.*, u.email as user_email, u.author_name as user_name 
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = ?
      ORDER BY r.created_at DESC
    `).all(book.id);

    res.json({ ...book, reviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/reader/:id
 * Obtiene datos completos del libro para el lector
 */
router.get("/reader/:id", ensureAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId || 1;
    const book = db.prepare(`
      SELECT b.*, f.*, p.progress
      FROM books_public b
      LEFT JOIN book_files f ON b.id = f.book_id
      LEFT JOIN reading_progress p ON b.id = p.book_id AND p.user_id = ?
      WHERE b.id = ?
    `).get(userId, req.params.id);

    if (!book) return res.status(404).json({ error: "Libro no encontrado" });

    // CONTROL DE ACCESO
    const isOwner = book.author_id === userId;
    const isFree = book.price === 0;
    const purchase = db.prepare("SELECT id FROM purchases WHERE user_id = ? AND book_id = ? AND (status = 'paid' OR status = 'free')").get(userId, book.id);
    
    const hasAccess = isOwner || isFree || purchase;

    if (!hasAccess) {
      // Si no tiene acceso, solo devolvemos la muestra (sample_url) y ocultamos el contenido completo
      return res.json({
        ...book,
        pdf_url: null, // Bloqueado
        access_denied: true,
        message: "Debes comprar este libro para leerlo completo"
      });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/dashboard/published
 * Libros publicados por el autor con analíticas
 */
router.get("/dashboard/published", ensureAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId || 1;

    const books = db.prepare(`
      SELECT 
        b.id, b.title, b.slug, b.created_at, b.word_count,
        (SELECT COUNT(*) FROM book_events WHERE book_id = b.id AND event_type = 'book_detail_view') as views,
        (SELECT COUNT(*) FROM book_events WHERE book_id = b.id AND event_type = 'full_read') as reads,
        (SELECT COUNT(*) FROM reviews WHERE book_id = b.id) as review_count,
        (SELECT AVG(rating) FROM reviews WHERE book_id = b.id) as avg_rating
      FROM books_public b
      WHERE b.author_id = ?
    `).all(userId);

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/marketplace/dashboard/sales
 * Historial de ventas para el autor
 */
router.get("/dashboard/sales", ensureAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId || 1;

    const sales = db.prepare(`
      SELECT 
        s.*, b.title as book_title
      FROM sales s
      JOIN books_public b ON s.book_id = b.id
      WHERE s.author_id = ?
      ORDER BY s.created_at DESC
    `).all(userId);

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/marketplace/book/:id/event
 * Registrar eventos manuales (sample_read, full_read)
 */
router.post("/book/:id/event", ensureAuth, (req, res) => {
  try {
    const { event_type } = req.body;
    const db = getDb();
    db.prepare("INSERT INTO book_events (book_id, user_id, event_type, created_at) VALUES (?, ?, ?, ?)")
      .run(req.params.id, req.session.userId || null, event_type, new Date().toISOString());
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Usuario / Biblioteca ---

/**
 * GET /api/library
 * Libros del usuario (comprados o propios)
 */
router.get("/library", ensureAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId || 1;
    
    const books = db.prepare(`
      SELECT b.*, f.cover_url, p.progress, (b.author_id = ?) as is_owner
      FROM books_public b
      LEFT JOIN book_files f ON b.id = f.book_id
      LEFT JOIN reading_progress p ON b.id = p.book_id AND p.user_id = ?
      LEFT JOIN purchases pur ON b.id = pur.book_id AND pur.user_id = ?
      WHERE b.author_id = ? OR pur.id IS NOT NULL
    `).all(userId, userId, userId, userId);

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/books/:id/review
 * Crear reseña
 */
router.post("/book/:id/review", ensureAuth, (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookId = req.params.id;
    const userId = req.session.userId || 1;
    const db = getDb();

    db.prepare(`
      INSERT INTO reviews (user_id, book_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, bookId, rating, comment, new Date().toISOString());

    res.json({ message: "Reseña guardada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/books/:id/progress
 * Guardar progreso de lectura
 */
router.post("/book/:id/progress", ensureAuth, (req, res) => {
  try {
    const { progress } = req.body;
    const bookId = req.params.id;
    const userId = req.session.userId || 1;
    const db = getDb();

    db.prepare(`
      INSERT INTO reading_progress (user_id, book_id, progress, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        progress = excluded.progress,
        updated_at = excluded.updated_at
    `).run(userId, bookId, progress, new Date().toISOString());

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
