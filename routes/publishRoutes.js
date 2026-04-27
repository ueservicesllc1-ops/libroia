const express = require("express");
const router = express.Router();
const { getDb } = require("../lib/billing/db");
const { uploadToB2 } = require("../lib/storageService");
const { getFirebaseAdmin } = require("../lib/firebaseAdmin");
const DOMPurify = require("isomorphic-dompurify");
const { requirePlan } = require("../middleware/requireAuth");

// Helper para slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
};

// Estimación de tiempo de lectura (200 ppm)
const estimateReadingTime = (text) => {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / 200);
};

/**
 * POST /api/publish/:id/publish  [PRO]
 * Publica un libro con calidad profesional
 */
router.post("/:id/publish", requirePlan("pro"), async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.session.userId || 1;
    const { subtitle, category, language, tags } = req.body;
    
    const db = getDb();
    const admin = getFirebaseAdmin();
    const firestore = admin.firestore();

    // 1. Obtener libro privado de Firestore
    const bookDoc = await firestore.collection("books").doc(bookId).get();
    if (!bookDoc.exists) return res.status(404).json({ error: "Libro no encontrado" });
    const bookData = bookDoc.data();

    if (bookData.user_id !== userId && !process.env.SKIP_AUTH) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (!bookData.title) return res.status(400).json({ error: "El libro debe tener un título" });

    // 2. Generar contenido y sanitizar
    const rawContent = [
      `# ${bookData.title}`,
      subtitle ? `## ${subtitle}` : "",
      "",
      bookData.synopsis ? `> ${bookData.synopsis}` : "",
      "",
      ...bookData.chapters.flatMap((ch) => [`## ${ch.title}`, "", ch.content || "", ""]),
    ].join("\n");

    const cleanContent = DOMPurify.sanitize(rawContent);
    const wordCount = cleanContent.trim().split(/\s+/).length;
    const readingTime = estimateReadingTime(cleanContent);

    // 3. Generar Muestra (Primer 10% o primer capítulo)
    const sampleLimit = Math.floor(cleanContent.length * 0.1);
    const sampleContent = cleanContent.substring(0, Math.max(2000, sampleLimit)) + "\n\n... (Continúa en la versión completa)";

    // 4. Slugs y B2
    let slug = slugify(bookData.title);
    const now = new Date().toISOString();

    const mdPath = `books/${bookId}/content.md`;
    const samplePath = `books/${bookId}/sample.md`;
    
    // Si no hay portada, usamos un placeholder elegante
    const coverUrl = bookData.coverUrl || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop";
    
    const mdUrl = await uploadToB2(Buffer.from(cleanContent), mdPath, "text/markdown");
    const sampleUrl = await uploadToB2(Buffer.from(sampleContent), samplePath, "text/markdown");

    // 5. Guardar en SQLite
    db.transaction(() => {
      db.prepare(`
        INSERT INTO books_public (
          id, author_id, title, subtitle, slug, description,
          cover_url, category, language, tags, word_count,
          reading_time_minutes, is_published, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          subtitle = excluded.subtitle,
          slug = excluded.slug,
          description = excluded.description,
          cover_url = excluded.cover_url,
          category = excluded.category,
          language = excluded.language,
          tags = excluded.tags,
          word_count = excluded.word_count,
          reading_time_minutes = excluded.reading_time_minutes,
          is_published = 1,
          updated_at = excluded.updated_at
      `).run(
        bookId, userId, bookData.title, subtitle || "", slug,
        bookData.synopsis || "Sin descripción", coverUrl,
        category || "General", language || "es", tags || "",
        wordCount, readingTime, now, now
      );

      db.prepare(`
        INSERT INTO book_files (book_id, cover_url, pdf_url, sample_url, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(book_id) DO UPDATE SET
          cover_url = excluded.cover_url,
          pdf_url = excluded.pdf_url,
          sample_url = excluded.sample_url,
          updated_at = excluded.updated_at
      `).run(bookId, coverUrl, mdUrl, sampleUrl, now);
    })();

    res.json({ message: "Libro publicado con calidad profesional", slug });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
