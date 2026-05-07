/* ═══════════════════════════════════════════════════════════════════════
   LibroAI — Premium Realistic Book Reader
   Page-flip engine with 3D CSS animation, paginated text, keyboard nav
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const pageLeftContent  = $("pageLeftContent");
  const pageRightContent = $("pageRightContent");
  const pageLeftNum      = $("pageLeftNum");
  const pageRightNum     = $("pageRightNum");
  const flipPage         = $("flipPage");
  const flipFrontContent = $("flipFrontContent");
  const flipBackContent  = $("flipBackContent");
  const bookNavTitle     = $("bookNavTitle");
  const pageIndicator    = $("pageIndicator");
  const pageCount        = $("pageCount");
  const progressFill     = $("progressFill");
  const progressTrack    = $("progressTrack");
  const loadingOverlay   = $("loadingOverlay");

  // ── State ─────────────────────────────────────────────────────────────
  let pages = [];        // array of HTML strings, one per book-page
  let currentSpread = 0; // index into pages (left page = currentSpread*2)
  let totalSpreads = 0;
  let isAnimating = false;
  let bookId = null;
  let isMobile = false;

  const urlParams = new URLSearchParams(window.location.search);
  bookId = urlParams.get("id") || urlParams.get("book_id");
  const isSample = urlParams.get("sample") === "true";

  // ── Helpers ───────────────────────────────────────────────────────────
  function checkMobile() {
    isMobile = window.innerWidth <= 600;
  }
  checkMobile();
  window.addEventListener("resize", () => {
    checkMobile();
    renderSpread();
  });

  /* Split rendered HTML into individual page-sized chunks.
     We render into a hidden measuring div, then split by available height. */
  function paginateHTML(html, bookTitle, synopsis) {
    const result = [];

    // ── Page 0: Title page ──────────────────────────────────────────
    result.push(
      `<div class="book-title-page">
         <div class="ornament-top"></div>
         <h1>${escHtml(bookTitle)}</h1>
         ${synopsis ? `<div class="subtitle">${escHtml(synopsis)}</div>` : ""}
         <div class="ornament-bottom"></div>
         <div class="author">LibroAI</div>
       </div>`
    );

    // ── Measure page capacity ───────────────────────────────────────
    const measure = document.createElement("div");
    measure.className = "page-text";
    measure.style.cssText = `
      position:absolute; visibility:hidden; pointer-events:none;
      width:364px; height:530px; overflow:hidden;
      font-size:14.5px; line-height:1.85; text-align:justify;
      padding:0; font-family:Lora,Georgia,serif;
    `;
    document.body.appendChild(measure);

    // Parse the markdown HTML into paragraph-level blocks
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const blocks = [];
    for (const child of wrapper.childNodes) {
      if (child.nodeType === 1) { // Element
        blocks.push(child.outerHTML);
      } else if (child.nodeType === 3 && child.textContent.trim()) {
        blocks.push(`<p>${child.textContent}</p>`);
      }
    }

    let currentPage = "";
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const tag = block.match(/^<(h[1-3])\b/i);

      // If it's a heading, start a chapter title page
      if (tag && (tag[1] === "h1" || tag[1] === "h2")) {
        // Flush current page first
        if (currentPage.trim()) {
          result.push(currentPage);
          currentPage = "";
        }
        const titleText = block.replace(/<[^>]+>/g, "").trim();
        const chNum = result.length;
        result.push(
          `<div class="chapter-title-page">
             <div class="chapter-label">Capítulo</div>
             <div class="chapter-name">${escHtml(titleText)}</div>
             <div class="chapter-ornament">✦ ✦ ✦</div>
           </div>`
        );
        continue;
      }

      // Try adding block to current page
      const test = currentPage + block;
      measure.innerHTML = test;
      if (measure.scrollHeight > measure.clientHeight && currentPage.trim()) {
        // Overflow — flush page, start new one with this block
        result.push(currentPage);
        currentPage = block;
        // Check if single block overflows (very long paragraph)
        measure.innerHTML = block;
        if (measure.scrollHeight > measure.clientHeight) {
          // Split the long block into sentences
          const sentences = splitIntoSentences(block);
          currentPage = "";
          for (const sentence of sentences) {
            const test2 = currentPage + sentence;
            measure.innerHTML = test2;
            if (measure.scrollHeight > measure.clientHeight && currentPage.trim()) {
              result.push(currentPage);
              currentPage = sentence;
            } else {
              currentPage = test2;
            }
          }
        }
      } else {
        currentPage = test;
      }
    }
    if (currentPage.trim()) {
      result.push(currentPage);
    }

    document.body.removeChild(measure);

    // Ensure even number of pages for spreads (pad with blank)
    if (result.length % 2 !== 0) {
      result.push("");
    }

    return result;
  }

  function splitIntoSentences(html) {
    // Strip tags, split, re-wrap
    const text = html.replace(/<[^>]+>/g, "");
    const parts = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    return parts.map(s => `<p>${s.trim()}</p>`);
  }

  function escHtml(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  // ── Render current spread ─────────────────────────────────────────────
  function renderSpread() {
    const leftIdx  = currentSpread * 2;
    const rightIdx = currentSpread * 2 + 1;

    if (isMobile) {
      // Single page mode
      const idx = currentSpread;
      pageRightContent.innerHTML = pages[idx] || "";
      pageRightNum.textContent   = idx + 1;
      totalSpreads = pages.length;
    } else {
      pageLeftContent.innerHTML  = pages[leftIdx]  || "";
      pageRightContent.innerHTML = pages[rightIdx] || "";
      pageLeftNum.textContent    = leftIdx >= 0 ? leftIdx + 1 : "";
      pageRightNum.textContent   = rightIdx < pages.length ? rightIdx + 1 : "";
      totalSpreads = Math.ceil(pages.length / 2);
    }

    updateUI();
  }

  function updateUI() {
    const total = isMobile ? pages.length : Math.ceil(pages.length / 2);
    const current = currentSpread + 1;
    const pct = total > 1 ? ((current - 1) / (total - 1)) * 100 : 100;

    if (isMobile) {
      pageCount.textContent = `${currentSpread + 1} / ${pages.length}`;
      pageIndicator.textContent = `Pág. ${currentSpread + 1}`;
    } else {
      const l = currentSpread * 2 + 1;
      const r = Math.min(currentSpread * 2 + 2, pages.length);
      pageCount.textContent = `${l}–${r} / ${pages.length}`;
      pageIndicator.textContent = `Pág. ${l}–${r}`;
    }
    progressFill.style.width = pct + "%";

    $("btnFirst").disabled = currentSpread <= 0;
    $("btnPrev").disabled  = currentSpread <= 0;
    const maxSpread = isMobile ? pages.length - 1 : Math.ceil(pages.length / 2) - 1;
    $("btnNext").disabled  = currentSpread >= maxSpread;
    $("btnLast").disabled  = currentSpread >= maxSpread;
  }

  // ── Page flip animation ───────────────────────────────────────────────
  function flipForward() {
    const maxSpread = isMobile ? pages.length - 1 : Math.ceil(pages.length / 2) - 1;
    if (isAnimating || currentSpread >= maxSpread) return;
    isAnimating = true;

    if (isMobile) {
      flipFrontContent.innerHTML = pages[currentSpread] || "";
      flipBackContent.innerHTML  = pages[currentSpread + 1] || "";
    } else {
      flipFrontContent.innerHTML = pages[currentSpread * 2 + 1] || "";
      flipBackContent.innerHTML  = pages[(currentSpread + 1) * 2] || "";
    }

    flipPage.className = "flip-page flipping flipping-forward";
    flipPage.style.left = isMobile ? "0" : "var(--page-w)";
    flipPage.style.transformOrigin = "left center";

    setTimeout(() => {
      currentSpread++;
      renderSpread();
      flipPage.className = "flip-page";
      isAnimating = false;
      saveProgress();
    }, 600);
  }

  function flipBackward() {
    if (isAnimating || currentSpread <= 0) return;
    isAnimating = true;

    if (isMobile) {
      flipFrontContent.innerHTML = pages[currentSpread] || "";
      flipBackContent.innerHTML  = pages[currentSpread - 1] || "";
    } else {
      flipFrontContent.innerHTML = pages[currentSpread * 2] || "";
      flipBackContent.innerHTML  = pages[(currentSpread - 1) * 2 + 1] || "";
    }

    flipPage.className = "flip-page flipping flipping-backward";
    flipPage.style.left = "0";
    flipPage.style.transformOrigin = "right center";

    setTimeout(() => {
      currentSpread--;
      renderSpread();
      flipPage.className = "flip-page";
      isAnimating = false;
      saveProgress();
    }, 600);
  }

  function goFirst() { if (currentSpread > 0) { currentSpread = 0; renderSpread(); saveProgress(); } }
  function goLast()  {
    const max = isMobile ? pages.length - 1 : Math.ceil(pages.length / 2) - 1;
    if (currentSpread < max) { currentSpread = max; renderSpread(); saveProgress(); }
  }

  // ── Event bindings ────────────────────────────────────────────────────
  $("navNext").addEventListener("click", flipForward);
  $("navPrev").addEventListener("click", flipBackward);
  $("btnNext").addEventListener("click", flipForward);
  $("btnPrev").addEventListener("click", flipBackward);
  $("btnFirst").addEventListener("click", goFirst);
  $("btnLast").addEventListener("click", goLast);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); flipForward(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); flipBackward(); }
    if (e.key === "Home") { e.preventDefault(); goFirst(); }
    if (e.key === "End") { e.preventDefault(); goLast(); }
  });

  // Touch swipe
  let touchStartX = 0;
  $("bookScene").addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  $("bookScene").addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? flipForward() : flipBackward();
    }
  }, { passive: true });

  // Progress bar click
  progressTrack.addEventListener("click", (e) => {
    const rect = progressTrack.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const max = isMobile ? pages.length - 1 : Math.ceil(pages.length / 2) - 1;
    currentSpread = Math.round(pct * max);
    renderSpread();
    saveProgress();
  });

  // ── Progress save ─────────────────────────────────────────────────────
  let lastSaved = -1;
  function saveProgress() {
    if (!bookId) return;
    const total = isMobile ? pages.length : Math.ceil(pages.length / 2);
    const pct = total > 1 ? (currentSpread / (total - 1)) * 100 : 100;
    const rounded = Math.round(pct);
    if (rounded === lastSaved) return;
    lastSaved = rounded;

    fetch(`/api/marketplace/book/${bookId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: rounded }),
    }).catch(() => {});

    if (rounded > 95) {
      fetch(`/api/marketplace/book/${bookId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "full_read" }),
      }).catch(() => {});
    }
  }

  // ── Load book ─────────────────────────────────────────────────────────
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

      document.title = (isSample ? "[Muestra] " : "") + `${book.title} — LibroAI`;
      bookNavTitle.textContent = book.title;

      // Fetch content
      const contentUrl = isSample ? book.sample_url : book.pdf_url;
      let rawHTML = "";

      if (contentUrl) {
        const contentRes = await fetch(contentUrl);
        const markdown = await contentRes.text();
        const clean = markdown.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
        rawHTML = marked.parse(clean);
      } else {
        // Fallback: build from sample_content field
        rawHTML = book.sample_content
          ? marked.parse(book.sample_content)
          : "<p>El contenido de este libro no está disponible.</p>";
      }

      // Paginate
      pages = paginateHTML(rawHTML, book.title, book.subtitle || book.description || "");

      // Restore progress
      if (book.progress && !isSample) {
        const total = isMobile ? pages.length : Math.ceil(pages.length / 2);
        currentSpread = Math.round((book.progress / 100) * (total - 1));
      }

      renderSpread();

      // Register read event
      fetch(`/api/marketplace/book/${bookId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: isSample ? "sample_read" : "full_read_start" }),
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      bookNavTitle.textContent = "Error al cargar";
      pageRightContent.innerHTML = `<div class="chapter-title-page"><div class="chapter-name" style="color:#a04040;">No se pudo cargar el libro</div><div class="chapter-ornament" style="color:#a04040;">✕</div></div>`;
    } finally {
      setTimeout(() => loadingOverlay.classList.add("hidden"), 400);
    }
  }

  loadBook();
})();
