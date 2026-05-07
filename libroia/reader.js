/* ═══════════════════════════════════════════════════════════════════════
   LibroAI — Minimalist Modern Reader
   Clean, scroll-based reading experience
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const bookContent = $("bookContent");
  const bookNavTitle = $("bookNavTitle");
  const pageCount = $("pageCount");
  const progressFill = $("progressFill");
  const loadingOverlay = $("loadingOverlay");
  const readerStage = $("readerStage");

  let bookId = null;
  const urlParams = new URLSearchParams(window.location.search);
  bookId = urlParams.get("id") || urlParams.get("book_id");
  const isSample = urlParams.get("sample") === "true";

  // Update progress based on scroll
  readerStage.addEventListener("scroll", () => {
    const total = readerStage.scrollHeight - readerStage.clientHeight;
    if (total <= 0) return;
    const pct = Math.round((readerStage.scrollTop / total) * 100);
    progressFill.style.width = pct + "%";
    pageCount.textContent = pct + "%";
    
    // Save progress periodically
    debouncedSaveProgress(pct);
  });

  let saveTimeout = null;
  function debouncedSaveProgress(pct) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveProgress(pct), 2000);
  }

  function saveProgress(rounded) {
    if (!bookId || isSample) return;
    fetch(`/api/marketplace/book/${bookId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: rounded }),
    }).catch(() => {});
  }

  async function loadBook() {
    if (!bookId) {
      bookNavTitle.textContent = "ID no proporcionado";
      loadingOverlay.classList.add("hidden");
      return;
    }

    try {
      const res = await fetch(`/api/marketplace/reader/${bookId}`);
      const book = await res.json();
      if (book.error) throw new Error(book.error);

      document.title = `${book.title} — LibroAI`;
      bookNavTitle.textContent = book.title;

      const contentUrl = isSample ? book.sample_url : book.pdf_url;
      let rawHTML = "";

      if (contentUrl) {
        const contentRes = await fetch(contentUrl);
        const markdown = await contentRes.text();
        rawHTML = marked.parse(markdown);
      } else {
        rawHTML = book.sample_content
          ? marked.parse(book.sample_content)
          : "<p>Contenido no disponible.</p>";
      }

      bookContent.innerHTML = rawHTML;

      // Restore scroll position from progress
      if (book.progress && !isSample) {
        setTimeout(() => {
          const total = readerStage.scrollHeight - readerStage.clientHeight;
          readerStage.scrollTop = (book.progress / 100) * total;
        }, 100);
      }

    } catch (err) {
      console.error(err);
      bookContent.innerHTML = `<h2 style="text-align:center;color:#ef4444;">No se pudo cargar el libro</h2>`;
    } finally {
      setTimeout(() => loadingOverlay.classList.add("hidden"), 400);
    }
  }

  loadBook();
})();
