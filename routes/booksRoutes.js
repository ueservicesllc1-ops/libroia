const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { requireAuth, getUserId } = require("../middleware/requireAuth");

/**
 * @param {string} dataDir
 * @param {string} booksFile
 */
function createBooksRouter(dataDir, booksFile) {
  const router = express.Router();

  async function readRoot() {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(booksFile);
    } catch {
      const seed = {
        books: [
          {
            id: "book-default",
            user_id: 1,
            title: "Mi primer libro",
            synopsis: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            chapters: [
              {
                id: "chapter-1",
                title: "Capitulo 1",
                content: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        ],
      };
      await fs.writeFile(booksFile, JSON.stringify(seed, null, 2), "utf8");
    }
    const raw = await fs.readFile(booksFile, "utf8");
    return JSON.parse(raw);
  }

  async function writeRoot(data) {
    await fs.writeFile(booksFile, JSON.stringify(data, null, 2), "utf8");
  }

  function createId(prefix) {
    return prefix ? `${prefix}-${randomUUID()}` : randomUUID();
  }

  router.get("/", requireAuth, async (req, res) => {
    try {
      const data = await readRoot();
      const uid = getUserId(req);
      const list = data.books.filter((b) => Number(b.user_id) === Number(uid));
      res.json(list);
    } catch (err) {
      console.error("[books/list]", err);
      res.status(500).json({ error: "Error al leer los libros." });
    }
  });

  router.post("/", requireAuth, async (req, res) => {
    const { title, synopsis } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "El titulo es obligatorio" });
    }
    try {
      const data = await readRoot();
      const now = new Date().toISOString();
      const book = {
        id: createId("book"),
        user_id: getUserId(req),
        title: title.trim(),
        synopsis: synopsis || "",
        createdAt: now,
        updatedAt: now,
        chapters: [{
          id: createId("chapter"),
          title: "Capitulo 1",
          content: "",
          createdAt: now,
          updatedAt: now,
        }],
      };
      data.books.push(book);
      await writeRoot(data);
      res.status(201).json(book);
    } catch (err) {
      console.error("[books/create]", err);
      res.status(500).json({ error: "Error al crear el libro." });
    }
  });

  router.put("/:bookId", requireAuth, async (req, res) => {
    const { bookId } = req.params;
    const { title, synopsis } = req.body || {};
    const data = await readRoot();
    const book = data.books.find((b) => b.id === bookId);
    if (!book || Number(book.user_id) !== Number(getUserId(req))) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }
    if (typeof title === "string" && title.trim()) book.title = title.trim();
    if (typeof synopsis === "string") book.synopsis = synopsis;
    book.updatedAt = new Date().toISOString();
    await writeRoot(data);
    res.json(book);
  });

  router.post("/:bookId/chapters", requireAuth, async (req, res) => {
    const { bookId } = req.params;
    const { title } = req.body || {};
    const data = await readRoot();
    const book = data.books.find((b) => b.id === bookId);
    if (!book || Number(book.user_id) !== Number(getUserId(req))) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }
    const now = new Date().toISOString();
    const chapter = {
      id: createId("chapter"),
      title: (title && title.trim()) || `Capitulo ${book.chapters.length + 1}`,
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    book.chapters.push(chapter);
    book.updatedAt = now;
    await writeRoot(data);
    res.status(201).json(chapter);
  });

  router.put("/:bookId/chapters/:chapterId", requireAuth, async (req, res) => {
    const { bookId, chapterId } = req.params;
    const { title, content } = req.body || {};
    const data = await readRoot();
    const book = data.books.find((b) => b.id === bookId);
    if (!book || Number(book.user_id) !== Number(getUserId(req))) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }
    const chapter = book.chapters.find((c) => c.id === chapterId);
    if (!chapter) return res.status(404).json({ error: "Capitulo no encontrado" });
    if (typeof title === "string" && title.trim()) chapter.title = title.trim();
    if (typeof content === "string") chapter.content = content;
    const now = new Date().toISOString();
    chapter.updatedAt = now;
    book.updatedAt = now;
    await writeRoot(data);
    res.json(chapter);
  });

  router.get("/:bookId/export.md", requireAuth, async (req, res) => {
    const { bookId } = req.params;
    const data = await readRoot();
    const book = data.books.find((b) => b.id === bookId);
    if (!book || Number(book.user_id) !== Number(getUserId(req))) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }
    const md = [
      `# ${book.title}`,
      "",
      book.synopsis ? `> ${book.synopsis}` : "",
      "",
      ...book.chapters.flatMap((ch) => [`## ${ch.title}`, "", ch.content || "", ""]),
    ].join("\n");
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${book.title.replace(/[^\w\-]+/g, "_")}.md"`
    );
    res.send(md);
  });

  return router;
}

module.exports = { createBooksRouter };
