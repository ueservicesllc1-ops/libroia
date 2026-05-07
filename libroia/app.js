console.log("LibroAI App Script Loading...");
const statusText = document.getElementById("statusText");
const bookList = document.getElementById("bookList");
const bookTitleInput = document.getElementById("bookTitleInput");
const bookGenreInput = document.getElementById("bookGenreInput");
const bookAuthorInput = document.getElementById("bookAuthorInput");
const bookSynopsisInput = document.getElementById("bookSynopsisInput");
const saveBookMetaBtn = document.getElementById("saveBookMetaBtn");
const exportBtn = document.getElementById("exportBtn");
const chapterTitle = document.getElementById("chapterTitle");
const chapterNav = document.getElementById("chapterNav");
const editor = document.getElementById("editor");
const saveBtn = document.getElementById("saveBtn");
const publishBtn = document.getElementById("publishBtn");
const newBookBtn = document.getElementById("newBookBtn");
const newChapterBtn = document.getElementById("newChapterBtn");
const marketplaceBtn = document.getElementById("marketplaceBtn");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const continueBtn = document.getElementById("continueBtn");
const magicSplitBtn = document.getElementById("magicSplitBtn");
const viewAllBtn = document.getElementById("viewAllBtn");
const wipeChaptersBtn = document.getElementById("wipeChaptersBtn");
const previewBtn = document.getElementById("previewBtn");
const closePreviewBtn = document.getElementById("closePreviewBtn");
const printBtn = document.getElementById("printBtn");
const previewOverlay = document.getElementById("previewOverlay");
const previewContent = document.getElementById("previewContent");
const realBookBtn = document.getElementById("realBookBtn");
const realBookOverlay = document.getElementById("realBookOverlay");
const closeRealBookBtn = document.getElementById("closeRealBookBtn");
const realBookPrevBtn = document.getElementById("realBookPrevBtn");
const realBookNextBtn = document.getElementById("realBookNextBtn");
const realBookPageCounter = document.getElementById("realBookPageCounter");
const realBookPage = document.getElementById("realBookPage");
const realBookSoundBtn = document.getElementById("realBookSoundBtn");
const realBookClickPrev = document.getElementById("realBookClickPrev");
const realBookClickNext = document.getElementById("realBookClickNext");
const desktopMenuBar = document.getElementById("desktopMenuBar");
const recentProjectsWrap = document.getElementById("recentProjectsWrap");
const uiDialogOverlay = document.getElementById("uiDialogOverlay");
const uiDialogTitle = document.getElementById("uiDialogTitle");
const uiDialogMessage = document.getElementById("uiDialogMessage");
const uiDialogInput = document.getElementById("uiDialogInput");
const uiDialogOkBtn = document.getElementById("uiDialogOkBtn");
const uiDialogCancelBtn = document.getElementById("uiDialogCancelBtn");

const loginOverlay = document.getElementById("loginOverlay");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authPassword2Wrap = document.getElementById("authPassword2Wrap");
const authPassword2 = document.getElementById("authPassword2");
const authTabLogin = document.getElementById("authTabLogin");
const authTabRegister = document.getElementById("authTabRegister");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authTitle = document.getElementById("authTitle");
const googleSignInWrap = document.getElementById("googleSignInWrap");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const googleSignInFallback = document.getElementById("googleSignInFallback");
const logoutBtn = document.getElementById("logoutBtn");
const usagePanel = document.getElementById("usagePanel");
const usageSummary = document.getElementById("usageSummary");
const usageBar = document.getElementById("usageBar");
const usageAlert = document.getElementById("usageAlert");
const sonnetPaygToggle = document.getElementById("sonnetPaygToggle");
const sonnetSpendLimit = document.getElementById("sonnetSpendLimit");
const saveSonnetBillingBtn = document.getElementById("saveSonnetBillingBtn");
const sonnetSpendSummary = document.getElementById("sonnetSpendSummary");
const requestTypeEl = document.getElementById("requestType");
const sonnetCostPreview = document.getElementById("sonnetCostPreview");
const sonnetBillingPanel = document.getElementById("sonnetBillingPanel");
const planNameBadge = document.getElementById("planNameBadge");
const upgradeBtn = document.getElementById("upgradeBtn");
const trackerPlan = document.getElementById("trackerPlan");
const trackerValue = document.getElementById("trackerValue");
const bookCoverFile = document.getElementById("bookCoverFile");
const triggerCoverUpload = document.getElementById("triggerCoverUpload");
const coverUploadStatus = document.getElementById("coverUploadStatus");
const bookCoverPreview = document.getElementById("bookCoverPreview");
const coverImg = document.getElementById("coverImg");
const removeCoverBtn = document.getElementById("removeCoverBtn");
const publishOverlay = document.getElementById("publishOverlay");
const publishAuthorInput = document.getElementById("publishAuthorInput");
const publishPriceInput = document.getElementById("publishPriceInput");
const publishCategoryInput = document.getElementById("publishCategoryInput");
const publishLanguageInput = document.getElementById("publishLanguageInput");
const publishTagsInput = document.getElementById("publishTagsInput");
const publishCoverStatus = document.getElementById("publishCoverStatus");
const publishUploadCoverBtn = document.getElementById("publishUploadCoverBtn");
const publishCancelBtn = document.getElementById("publishCancelBtn");
const publishConfirmBtn = document.getElementById("publishConfirmBtn");
const publishErrorMsg = document.getElementById("publishErrorMsg");

// Onboarding
const onboardingOverlay = document.getElementById("onboardingOverlay");
const obStep0 = document.getElementById("obStep0");
const obStep1 = document.getElementById("obStep1");
const obStep2 = document.getElementById("obStep2");
const obStep3 = document.getElementById("obStep3");
const obStepOpen = document.getElementById("obStepOpen");
const obBookSelectorList = document.getElementById("obBookSelectorList");
const obNewBookBtn = document.getElementById("obNewBookBtn");
const obOpenBookBtn = document.getElementById("obOpenBookBtn");
const obBookTitle = document.getElementById("obBookTitle");
const obGenreOther = document.getElementById("obGenreOther");
const obAuthorName = document.getElementById("obAuthorName");
const obFinishBtn = document.getElementById("obFinishBtn");
const genreOtroRadio = document.getElementById("genreOtroRadio");
const obSteps = [obStep0, obStep1, obStep2, obStep3, obStepOpen];
let currentObStep = 0;

/** @type {{ skipAuth: boolean, billingRelaxed: boolean, googleClientId: string }} */
let clientConfig = { skipAuth: false, billingRelaxed: false, googleClientId: "" };

let authMode = "login";
let googleGsiLoading = false;
let googleInitDone = false;

let books = [];
let selectedBookId = null;
let selectedChapterId = null;
let lastSuggestion = "";
let currentUserId = null;
let currentUser = null;  // objeto completo del usuario (incluye plan, is_admin, etc)
let hasUnsavedChanges = false;
let realBookPages = [];
let realBookPageIndex = 0;
let realBookFlip = null;
let realBookNavLock = false;
const REALBOOK_SOUND_KEY = "libroai_realbook_sound_enabled";
let realBookSoundEnabled = (() => {
  try {
    const stored = localStorage.getItem(REALBOOK_SOUND_KEY);
    return stored !== "0";
  } catch {
    return true;
  }
})();
const BLOCKED_PLANS_MODAL_KEY = "libroai_blocked_plans_modal_last_shown";
const DEMO_SEED_EMAIL = "demo@libroai.app";
let bookMetaSaveTimer = null;

function openUiDialog({ title = "Mensaje", message = "", mode = "alert", defaultValue = "" }) {
  return new Promise((resolve) => {
    if (!uiDialogOverlay) {
      resolve(mode === "confirm" ? false : mode === "prompt" ? null : undefined);
      return;
    }
    uiDialogTitle.textContent = title;
    uiDialogMessage.textContent = message;
    uiDialogInput.hidden = mode !== "prompt";
    uiDialogInput.value = defaultValue || "";
    uiDialogCancelBtn.hidden = mode === "alert";
    uiDialogOverlay.hidden = false;

    const cleanup = () => {
      uiDialogOverlay.hidden = true;
      uiDialogOkBtn.onclick = null;
      uiDialogCancelBtn.onclick = null;
      uiDialogOverlay.onclick = null;
      document.removeEventListener("keydown", onKey);
    };

    const onCancel = () => {
      cleanup();
      resolve(mode === "confirm" ? false : mode === "prompt" ? null : undefined);
    };
    const onOk = () => {
      cleanup();
      if (mode === "confirm") resolve(true);
      else if (mode === "prompt") resolve(uiDialogInput.value);
      else resolve(undefined);
    };
    const onKey = (e) => {
      if (uiDialogOverlay.hidden) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onOk();
      }
    };

    uiDialogOkBtn.onclick = onOk;
    uiDialogCancelBtn.onclick = onCancel;
    uiDialogOverlay.onclick = (e) => {
      if (e.target === uiDialogOverlay) onCancel();
    };
    document.addEventListener("keydown", onKey);
    if (mode === "prompt") setTimeout(() => uiDialogInput.focus(), 0);
    else setTimeout(() => uiDialogOkBtn.focus(), 0);
  });
}

async function uiAlert(message, title = "Aviso") {
  await openUiDialog({ title, message, mode: "alert" });
}

async function uiConfirm(message, title = "Confirmar") {
  return openUiDialog({ title, message, mode: "confirm" });
}

async function uiPrompt(message, defaultValue = "", title = "Escribe un valor") {
  return openUiDialog({ title, message, mode: "prompt", defaultValue });
}

function updateRealBookSoundButton() {
  if (!realBookSoundBtn) return;
  realBookSoundBtn.textContent = realBookSoundEnabled ? "🔊 Sonido" : "🔇 Silencio";
}

function playPageFlipSound() {
  if (!realBookSoundEnabled) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channelData.length; i += 1) {
      channelData[i] = (Math.random() * 2 - 1) * (1 - i / channelData.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 850;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.12);
    src.onended = () => ctx.close();
  } catch {
    // Silenciar errores de audio en navegadores restringidos.
  }
}

function htmlToReadableText(html) {
  const d = document.createElement("div");
  d.innerHTML = String(html || "");
  const text = d.textContent || d.innerText || "";
  return text
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\t/g, "    ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textToEditorHtml(text) {
  const safe = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return safe
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function updateRealBookCounter() {
  if (!realBookPageCounter || !realBookFlip) return;
  const idx = Number(realBookFlip.getCurrentPageIndex() || 0) + 1;
  const total = Number(realBookFlip.getPageCount() || 1);
  realBookPageCounter.textContent = `Página ${idx} de ${total}`;
  if (realBookPrevBtn) realBookPrevBtn.disabled = idx <= 1;
  if (realBookNextBtn) realBookNextBtn.disabled = idx >= total;
}

async function buildBookPdfBuffer(book) {
  if (!window.jspdf?.jsPDF) {
    throw new Error("No se pudo cargar el generador PDF.");
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();   // 595.28
  const h = doc.internal.pageSize.getHeight();  // 841.89

  const ML = 72;   // margin left
  const MR = 72;   // margin right
  const MT = 80;   // margin top
  const MB = 80;   // margin bottom
  const TW = w - ML - MR;  // text width
  const LS = 17;   // line step (pt)
  const FS = 11.5; // body font size

  let pageNum = 0;

  function addPageNum() {
    if (pageNum < 1) return;
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(140, 120, 90);
    const label = String(pageNum);
    if (pageNum % 2 === 0) {
      doc.text(label, ML, h - 36);
    } else {
      doc.text(label, w - MR, h - 36, { align: "right" });
    }
    doc.setTextColor(0, 0, 0);
  }

  function newPage() {
    if (pageNum > 0) addPageNum();
    doc.addPage();
    pageNum++;
    return MT;
  }

  // Cover page
  const title    = String(book.title      || "Mi libro");
  const author   = String(book.authorName || "");
  const genre    = String(book.genre      || "");
  const synopsis = String(book.synopsis   || "");

  doc.setFillColor(249, 243, 228);
  doc.rect(0, 0, w, h, "F");

  doc.setDrawColor(160, 130, 60);
  doc.setLineWidth(0.5);
  doc.line(ML, 90, w - MR, 90);
  doc.setLineWidth(0.2);
  doc.line(ML, 94, w - MR, 94);

  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(25, 18, 8);
  const titleLines = doc.splitTextToSize(title, TW);
  let ty = 180;
  titleLines.forEach((ln) => { doc.text(ln, w / 2, ty, { align: "center" }); ty += 40; });

  doc.setFont("times", "normal");
  doc.setFontSize(16);
  doc.setTextColor(160, 130, 60);
  doc.text("\u2726  \u2726  \u2726", w / 2, ty + 20, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(80, 65, 35);
  doc.text(author, w / 2, ty + 60, { align: "center" });

  if (genre) {
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(130, 110, 70);
    doc.text(genre.toUpperCase(), w / 2, ty + 86, { align: "center", charSpace: 2 });
  }

  if (synopsis) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 85, 55);
    const synLines = doc.splitTextToSize(synopsis, TW - 60);
    let sy = ty + 130;
    synLines.slice(0, 6).forEach((ln) => { doc.text(ln, w / 2, sy, { align: "center" }); sy += 16; });
  }

  doc.setDrawColor(160, 130, 60);
  doc.setLineWidth(0.5);
  doc.line(ML, h - 90, w - MR, h - 90);
  doc.setLineWidth(0.2);
  doc.line(ML, h - 86, w - MR, h - 86);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 120, 80);
  doc.text("LibroAI", w / 2, h - 60, { align: "center" });

  // Chapters
  const chapters = Array.isArray(book.chapters) ? book.chapters : [];

  chapters.forEach((ch, i) => {
    // Chapter title page
    if (pageNum > 0) addPageNum();
    doc.addPage();
    pageNum++;

    doc.setFillColor(248, 242, 226);
    doc.rect(0, 0, w, h, "F");

    const chTitle = String(ch?.title || ("Cap\u00edtulo " + (i + 1)));

    doc.setFont("times", "normal");
    doc.setFontSize(13);
    doc.setTextColor(150, 120, 60);
    doc.text("CAP\u00cdTULO", w / 2, h / 2 - 60, { align: "center", charSpace: 3 });

    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.setTextColor(25, 18, 8);
    const chTitleLines = doc.splitTextToSize(chTitle, TW - 40);
    let cty = h / 2 - 20;
    chTitleLines.forEach((ln) => { doc.text(ln, w / 2, cty, { align: "center" }); cty += 36; });

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.setTextColor(160, 130, 60);
    doc.text("\u2726", w / 2, cty + 20, { align: "center" });

    // Content pages
    let y = newPage();

    // Running header
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(150, 130, 90);
    doc.text(title, w / 2, 52, { align: "center" });
    doc.setDrawColor(200, 180, 130);
    doc.setLineWidth(0.3);
    doc.line(ML, 58, w - MR, 58);
    doc.setTextColor(0, 0, 0);

    const rawText = htmlToReadableText(ch?.content || "") || "(Cap\u00edtulo vac\u00edo)";
    const paragraphs = rawText
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(Boolean);

    doc.setFont("times", "normal");
    doc.setFontSize(FS);
    doc.setTextColor(22, 16, 6);

    let firstPara = true;
    paragraphs.forEach((para) => {
      const lines  = doc.splitTextToSize(para, TW);
      const blockH = lines.length * LS;

      if (y + blockH > h - MB) {
        y = newPage();
        doc.setFont("times", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(150, 130, 90);
        doc.text(chTitle, w / 2, 52, { align: "center" });
        doc.setDrawColor(200, 180, 130);
        doc.setLineWidth(0.3);
        doc.line(ML, 58, w - MR, 58);
        doc.setFont("times", "normal");
        doc.setFontSize(FS);
        doc.setTextColor(22, 16, 6);
      }

      const indent = firstPara ? 0 : 22;
      firstPara = false;

      lines.forEach((line, li) => {
        const isLast = li === lines.length - 1;
        const xStart = ML + (li === 0 ? indent : 0);
        const xWidth = TW - (li === 0 ? indent : 0);

        if (!isLast && lines.length > 1) {
          const words = line.trim().split(/\s+/);
          if (words.length > 1) {
            const textW  = doc.getTextWidth(words.join(""));
            const spaceW = (xWidth - textW) / (words.length - 1);
            let wx = xStart;
            words.forEach((word) => {
              doc.text(word, wx, y);
              wx += doc.getTextWidth(word) + spaceW;
            });
          } else {
            doc.text(line, xStart, y);
          }
        } else {
          doc.text(line, xStart, y);
        }
        y += LS;
      });

      y += 8;
    });

    addPageNum();
  });

  return doc.output("arraybuffer");
}

async function renderPdfFlipbook(pdfBuffer) {
  if (!window.pdfjsLib) throw new Error("No se pudo cargar PDF.js.");
  if (!window.St?.PageFlip) throw new Error("No se pudo cargar el motor flipbook.");
  if (!realBookPage) return;

  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

  const pdf  = await pdfjs.getDocument({ data: pdfBuffer }).promise;
  const host = document.createElement("div");
  host.className = "realbook-flipbook";
  realBookPage.innerHTML = "";
  realBookPage.appendChild(host);

  const SCALE = 2.0; // 2x for crisp retina rendering

  for (let p = 1; p <= pdf.numPages; p++) {
    const page   = await pdf.getPage(p);
    const vp     = page.getViewport({ scale: SCALE });
    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d");
    canvas.width  = vp.width;
    canvas.height = vp.height;
    ctx.fillStyle = "#f8f2e0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const img     = document.createElement("img");
    img.src       = canvas.toDataURL("image/jpeg", 0.94);
    img.alt       = "P\u00e1gina " + p;
    img.className = "realbook-pdf-image";
    img.draggable = false;

    const div     = document.createElement("div");
    div.className = "realbook-flip-page";
    div.appendChild(img);
    host.appendChild(div);
  }

  if (realBookFlip) {
    try { realBookFlip.destroy(); } catch {}
    realBookFlip = null;
  }

  realBookFlip = new window.St.PageFlip(host, {
    width:               500,
    height:              708,
    size:                "stretch",
    minWidth:            280,
    maxWidth:            1000,
    minHeight:           380,
    maxHeight:           1420,
    drawShadow:          true,
    flippingTime:        750,
    usePortrait:         false,
    startZIndex:         10,
    maxShadowOpacity:    0.45,
    showCover:           true,
    mobileScrollSupport: false,
    clickEventForward:   false,
  });
  realBookFlip.loadFromHTML(host.querySelectorAll(".realbook-flip-page"));

  realBookFlip.on("flip", () => {
    updateRealBookCounter();
    playPageFlipSound();
    setTimeout(() => { realBookNavLock = false; }, 150);
  });
  realBookFlip.on("changeOrientation", () => {
    updateRealBookCounter();
    realBookNavLock = false;
  });
  updateRealBookCounter();
}

function goRealBookPrev() {
  if (!realBookFlip) return;
  if (realBookNavLock) return;
  realBookNavLock = true;
  realBookFlip.flipPrev();
}

function goRealBookNext() {
  if (!realBookFlip) return;
  if (realBookNavLock) return;
  realBookNavLock = true;
  realBookFlip.flipNext();
}

function shouldAutoOpenBlockedPlansModal() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastShown = localStorage.getItem(BLOCKED_PLANS_MODAL_KEY);
    return lastShown !== today;
  } catch {
    // Fallback seguro si localStorage no está disponible.
    return true;
  }
}

function markBlockedPlansModalShownToday() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(BLOCKED_PLANS_MODAL_KEY, today);
  } catch {
    // Ignorar errores de storage silenciosamente.
  }
}

// ─── REVISIÓN EDITORIAL CON IA ──────────────────────────────────────────
const revOverlay = document.getElementById("revisionOverlay");
const revOriginal = document.getElementById("revOriginal");
const revProposed = document.getElementById("revProposed");
const revApplyBtn = document.getElementById("revApplyBtn");
const revCancelBtn = document.getElementById("revCancelBtn");
let currentRevisionData = null;

// Helper: muestra el modal de planes si el usuario no tiene plan PRO
function hasProAccess(user) {
  if (!user) return false;
  const p = String(user.plan || "").toLowerCase();
  return user.is_admin || p === "pro" || p === "basic";
}

function requireProUI() {
  if (hasProAccess(currentUser)) return true;
  // Abrir modal de planes
  const plansModal = document.getElementById('plansModal');
  if (plansModal) plansModal.hidden = false;
  return false;
}

// Botón: Revisar Capítulo [PRO]
document.getElementById("aiReviseChapterBtn")?.addEventListener("click", async () => {
  if (!requireProUI()) return;
  const content = editor.innerHTML;
  if (!content || content.length < 50) return uiAlert("Escribe un poco más para poder revisar.");
  setStatus("✨ Revisando capítulo...");
  try {
    const res = await fetch("/api/ai/revise-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, book_id: selectedBookId })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    revOriginal.textContent = editor.innerText;
    revProposed.textContent = data.revised;
    currentRevisionData = { type: 'chapter', content: data.revised };
    revOverlay.hidden = false;
    setStatus("Revisión lista");
  } catch (err) {
    uiAlert("Error: " + err.message);
    setStatus("Error en revisión");
  }
});

// Botón: Revisar Libro [PRO]
document.getElementById("aiReviseBookBtn")?.addEventListener("click", async () => {
  if (!requireProUI()) return;
  const book = getSelectedBook();
  if (!book || !Array.isArray(book.chapters) || !book.chapters.length) {
    return uiAlert("Selecciona un libro con capítulos para revisar.");
  }

  setStatus("📚 Revisando libro completo...");
  try {
    const revisedByChapterId = {};
    for (let i = 0; i < book.chapters.length; i += 1) {
      const ch = book.chapters[i];
      const content = htmlToReadableText(ch.content || "");
      if (!content || content.length < 30) {
        revisedByChapterId[ch.id] = ch.content || "";
        continue;
      }

      setStatus(`📚 Revisando capítulo ${i + 1}/${book.chapters.length}...`);
      const res = await fetch("/api/ai/revise-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, book_id: selectedBookId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Error revisando capítulo ${i + 1}`);
      }
      revisedByChapterId[ch.id] = textToEditorHtml(data.revised || "");
    }

    revOriginal.textContent = `Capítulos detectados: ${book.chapters.length}\n\nSe generó una propuesta de revisión para todo el libro.`;
    revProposed.textContent = "La revisión está lista. Pulsa \"Aplicar Cambios\" para reemplazar cada capítulo con su versión corregida.";
    currentRevisionData = { type: "book", revisedByChapterId };
    revOverlay.hidden = false;
    setStatus("Revisión completa del libro lista");
  } catch (err) {
    uiAlert("Error: " + err.message);
    setStatus("Error en revisión de libro");
  }
});

// Botón: Organizar Manuscrito [PRO]
document.getElementById("aiOrganizeBtn")?.addEventListener("click", async () => {
  if (!requireProUI()) return;
  const content = editor.innerHTML;
  setStatus("🪄 Organizando manuscrito...");
  try {
    const res = await fetch("/api/ai/organize-manuscript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, book_id: selectedBookId })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    let newContent = "";
    data.structured.structure.forEach(item => {
      newContent += `<h3>${item.title}</h3>\n${item.content}\n\n`;
    });
    revOriginal.textContent = editor.innerText.substring(0, 500) + "...";
    revProposed.textContent = "Nueva estructura con " + data.structured.structure.length + " secciones detectadas.";
    currentRevisionData = { type: 'organize', content: newContent };
    revOverlay.hidden = false;
    setStatus("Organización lista");
  } catch (err) {
    uiAlert("Error: " + err.message);
    setStatus("Error en organización");
  }
});

revCancelBtn?.addEventListener("click", () => {
  revOverlay.hidden = true;
  currentRevisionData = null;
});

revApplyBtn?.addEventListener("click", () => {
  if (currentRevisionData?.type === "book") {
    const book = getSelectedBook();
    if (!book) {
      revOverlay.hidden = true;
      currentRevisionData = null;
      return;
    }
    const revisedByChapterId = currentRevisionData.revisedByChapterId || {};
    const now = new Date().toISOString();
    book.chapters.forEach((ch) => {
      if (Object.prototype.hasOwnProperty.call(revisedByChapterId, ch.id)) {
        ch.content = revisedByChapterId[ch.id];
        ch.updatedAt = now;
      }
    });
    book.updatedAt = now;
    const { doc, setDoc } = window.fb;
    setDoc(doc(window.firebaseDb, "books", book.id), book)
      .then(() => {
        syncEditorFromSelection();
        renderBooks();
        setStatus("✅ Revisión del libro aplicada");
      })
      .catch((err) => {
        console.error(err);
        setStatus("⚠️ Error al guardar revisión del libro");
      });
    revOverlay.hidden = true;
    currentRevisionData = null;
    return;
  }

  if (currentRevisionData) {
    editor.innerHTML = currentRevisionData.content;
    saveCurrentChapter(); 
    revOverlay.hidden = true;
    currentRevisionData = null;
    uiAlert("Cambios aplicados correctamente.");
  }
});

const fetchOpts = { credentials: "include" };

function asBool(v) {
  return v === true || v === 1 || String(v).toLowerCase() === "true";
}

function showOnboardingStep(stepIdxOrId) {
  if (typeof stepIdxOrId === "number") {
    obSteps.forEach((s, i) => (s.hidden = i !== stepIdxOrId));
    currentObStep = stepIdxOrId;
  } else {
    obSteps.forEach((s) => (s.hidden = s.id !== stepIdxOrId));
  }
}

function resetOnboarding() {
  obBookTitle.value = "";
  obAuthorName.value = "";
  obGenreOther.value = "";
  obGenreOther.hidden = true;
  document.querySelectorAll('input[name="obGenre"]').forEach(r => r.checked = false);
  showOnboardingStep(0);
  
  if (obBookSelectorList) obBookSelectorList.innerHTML = "";

  // Limpiar el editor en el fondo para que el usuario sepa que empezamos de cero
  editor.innerHTML = "";
  chapterTitle.value = "";
  bookTitleInput.value = "";
  bookGenreInput.value = "";
  bookAuthorInput.value = "";
  bookSynopsisInput.value = "";
}

async function finishOnboarding() {
  const title = obBookTitle.value.trim();
  let genre = "";
  const selectedGenre = document.querySelector('input[name="obGenre"]:checked');
  if (selectedGenre) {
    genre = selectedGenre.value === "Otro" ? obGenreOther.value.trim() : selectedGenre.value;
  }
  const author = obAuthorName.value.trim();

  if (!title) {
    uiAlert("Por favor, ponle un título a tu libro.");
    showOnboardingStep(1);
    return;
  }

  const book = await createBook(title, genre, author);
  if (book) {
    onboardingOverlay.hidden = true;
    document.body.classList.remove('is-loading');
    // Saludo inicial de la IA
    const greeting = `¡Hola ${author || "escritor"}! 📝 Ya tengo todo listo para que empecemos con **"${title}"**. Veo que es una obra de **${genre || "género por definir"}**. ¿Por dónde te gustaría empezar? Puedo ayudarte con el esquema, ideas para el primer capítulo o lo que necesites.`;
    addMessage("ai", greeting);
  }
}

async function loadClientConfig() {
  if (location.protocol === "file:") {
    clientConfig = { skipAuth: false, billingRelaxed: false, googleClientId: "" };
    const b = document.getElementById("loginBanner");
    if (b) {
      b.textContent =
        "No abras index.html como archivo. Ejecuta npm start en la carpeta del proyecto y entra en http://localhost:3000 (o el puerto que muestre la consola).";
    }
    return;
  }
  try {
    const r = await fetch("/api/config/public");
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    clientConfig = {
      skipAuth: asBool(data.skipAuth),
      billingRelaxed: asBool(data.billingRelaxed),
      googleClientId: typeof data.googleClientId === "string" ? data.googleClientId : "",
    };
  } catch {
    clientConfig = { skipAuth: false, billingRelaxed: false, googleClientId: "" };
    setStatus(
      "No se pudo leer la configuración del servidor. Ejecuta npm start en la carpeta del proyecto y abre http://localhost:3000"
    );
  }
  if (clientConfig.skipAuth) {
    loginOverlay.hidden = true;
    logoutBtn.style.display = "none";
  }
  if (clientConfig.billingRelaxed) {
    usagePanel.hidden = true;
    if (sonnetBillingPanel) sonnetBillingPanel.hidden = true;
  }
  if (googleSignInWrap) {
    googleSignInWrap.hidden = clientConfig.skipAuth;
  }
}

function setAuthTab(mode) {
  authMode = mode;
  const isReg = mode === "register";
  authTabLogin.classList.toggle("active", !isReg);
  authTabRegister.classList.toggle("active", isReg);
  authTabLogin.setAttribute("aria-selected", String(!isReg));
  authTabRegister.setAttribute("aria-selected", String(isReg));
  authPassword2Wrap.hidden = !isReg;
  authPassword2.required = isReg;
  authTitle.textContent = isReg ? "Crear cuenta" : "Entrar";
  authSubmitBtn.textContent = isReg ? "Registrarse" : "Entrar";
  authPassword.autocomplete = isReg ? "new-password" : "current-password";
  if (!isReg) authPassword2.value = "";
}

async function handleFirebaseGoogleSignIn() {
  if (!window.firebaseAuth || !window.firebaseSignInWithPopup || !window.firebaseGoogleProvider) {
    setStatus("Firebase no está cargado todavía.");
    return;
  }
  try {
    setStatus("Abriendo Google...");
    const result = await window.firebaseSignInWithPopup(window.firebaseAuth, window.firebaseGoogleProvider);
    const token = await result.user.getIdToken();
    
    setStatus("Verificando...");
    // ─── REVISIÓN EDITORIAL CON IA ──────────────────────────────────────────


    const r = await fetch("/api/auth/firebase", {
      method: "POST",
      ...fetchOpts,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Login fallido en el servidor");
    
    loginOverlay.hidden = true;
    chatMessages.innerHTML = "";
    await loadData().catch((err) => setStatus(err.message));
    setStatus("Sesión iniciada con Google.");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Error con Google");
  }
}

function setStatus(text) {
  statusText.textContent = text;
  const loginErrorMsg = document.getElementById("loginErrorMsg");
  if (loginErrorMsg && !loginOverlay.hidden) {
    if (text === "Listo" || text.includes("Sesión iniciada") || text.includes("Cuenta creada") || text.includes("Abriendo Google")) {
      loginErrorMsg.hidden = true;
    } else {
      loginErrorMsg.textContent = text;
      loginErrorMsg.hidden = false;
    }
  }
}

function setPublishError(message) {
  if (!publishErrorMsg) return;
  if (!message) {
    publishErrorMsg.hidden = true;
    publishErrorMsg.textContent = "";
    return;
  }
  publishErrorMsg.textContent = message;
  publishErrorMsg.hidden = false;
}

function refreshPublishCoverState() {
  if (!publishCoverStatus || !publishUploadCoverBtn) return;
  const book = getSelectedBook();
  if (!book) return;
  if (book.coverUrl) {
    publishCoverStatus.textContent = "Portada lista.";
    publishUploadCoverBtn.textContent = "Cambiar portada";
  } else {
    publishCoverStatus.textContent = "Este libro no tiene portada. Sube una para publicar.";
    publishUploadCoverBtn.textContent = "Subir portada";
  }
}

function openPublishModal() {
  const book = getSelectedBook();
  if (!book || !publishOverlay) return;
  const authorValue = (book.authorName || bookAuthorInput.value || "").trim();
  publishAuthorInput.value = authorValue;
  publishPriceInput.value = Number.isFinite(Number(book.price)) ? (Number(book.price) / 100).toFixed(2) : "0.00";
  publishCategoryInput.value = book.category || "General";
  publishLanguageInput.value = book.language || "es";
  publishTagsInput.value = book.tags || "";
  refreshPublishCoverState();
  setPublishError("");
  publishOverlay.hidden = false;
}

function closePublishModal() {
  if (publishOverlay) publishOverlay.hidden = true;
  setPublishError("");
}

function getSelectedBook() {
  return books.find((b) => b.id === selectedBookId) || null;
}

function getSelectedChapter() {
  const book = getSelectedBook();
  if (!book) return null;
  return book.chapters.find((c) => c.id === selectedChapterId) || null;
}

function closeDesktopMenus() {
  document.querySelectorAll(".desktop-menu-item.open").forEach((item) => item.classList.remove("open"));
  document.querySelectorAll(".desktop-menu-dropdown button.menu-kbd-active").forEach((b) => b.classList.remove("menu-kbd-active"));
}

function getOpenDesktopMenuItem() {
  return document.querySelector(".desktop-menu-item.open");
}

function getOpenDesktopMenuButtons() {
  const openItem = getOpenDesktopMenuItem();
  if (!openItem) return [];
  return [...openItem.querySelectorAll(".desktop-menu-dropdown button")].filter((btn) => btn.offsetParent !== null);
}

function moveMenuKeyboardSelection(step) {
  const buttons = getOpenDesktopMenuButtons();
  if (!buttons.length) return;
  let idx = buttons.findIndex((b) => b.classList.contains("menu-kbd-active"));
  if (idx < 0) idx = 0;
  else idx = (idx + step + buttons.length) % buttons.length;
  buttons.forEach((b) => b.classList.remove("menu-kbd-active"));
  buttons[idx].classList.add("menu-kbd-active");
}

function openDesktopMenu(name) {
  const item = desktopMenuBar?.querySelector(`.desktop-menu-item[data-menu="${name}"]`);
  if (!item) return;
  closeDesktopMenus();
  item.classList.add("open");
  if (name === "file") {
    refreshRecentProjectsMenu();
    const hasProject = !!getSelectedBook();
    item.querySelector('[data-file-action="save"]')?.toggleAttribute("disabled", !hasProject);
    item.querySelector('[data-file-action="saveAs"]')?.toggleAttribute("disabled", !hasProject);
    item.querySelector('[data-file-action="closeProject"]')?.toggleAttribute("disabled", !hasProject);
  }
  moveMenuKeyboardSelection(0);
}

function openProjectSelectorMenu() {
  if (books.length > 0) {
    obBookSelectorList.innerHTML = "";
    books.forEach((book) => {
      const item = document.createElement("div");
      item.className = "ob-book-item";
      const date = new Date(book.updatedAt || book.createdAt).toLocaleDateString();
      item.innerHTML = `
        <div class="ob-book-info">
          <span class="ob-book-name">${book.title}</span>
          <span class="ob-book-meta">${book.genre || "Sin género"} • ${book.chapters.length} cap. • ${date}</span>
        </div>
        <span class="ob-icon">➡️</span>
      `;
      item.onclick = () => {
        selectedBookId = book.id;
        selectedChapterId = book.chapters[0]?.id || null;
        onboardingOverlay.hidden = true;
        document.body.classList.remove("is-loading");
        syncEditorFromSelection();
        renderBooks();
        addMessage("ai", `¡Excelente elección! 👋 He cargado **"${book.title}"**. ¿Qué te gustaría trabajar ahora?`);
      };
      obBookSelectorList.appendChild(item);
    });
    showOnboardingStep("obStepOpen");
    onboardingOverlay.hidden = false;
    return;
  }

  uiAlert("No encontramos proyectos guardados en tu cuenta. Vamos a crear uno nuevo.");
  resetOnboarding();
  showOnboardingStep(1);
  onboardingOverlay.hidden = false;
}

function refreshRecentProjectsMenu() {
  if (!recentProjectsWrap) return;
  recentProjectsWrap.innerHTML = "";
  const recent = [...books]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 6);
  recent.forEach((book) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = book.title || "Proyecto sin título";
    btn.addEventListener("click", () => {
      selectedBookId = book.id;
      selectedChapterId = book.chapters[0]?.id || null;
      syncEditorFromSelection();
      renderBooks();
      setStatus(`Proyecto abierto: ${book.title}`);
      closeDesktopMenus();
    });
    recentProjectsWrap.appendChild(btn);
  });
}

async function handleFileAction(action) {
  const confirmSaveIfNeeded = async () => {
    if (!hasUnsavedChanges || !getSelectedBook()) return true;
    const saveNow = await uiConfirm("Tienes cambios sin guardar. ¿Quieres guardar antes de continuar?");
    if (saveNow) await saveCurrentChapter();
    return true;
  };

  if (action === "new") {
    await confirmSaveIfNeeded();
    resetOnboarding();
    showOnboardingStep(1);
    onboardingOverlay.hidden = false;
  } else if (action === "save") {
    await saveCurrentChapter();
  } else if (action === "saveAs") {
    const source = getSelectedBook();
    if (!source) return;
    const title = await uiPrompt("Guardar como (nombre del nuevo proyecto):", `${source.title || "Proyecto"} (copia)`);
    if (!title) return;
    const created = await createBook(title.trim(), source.genre || "", source.authorName || "");
    if (!created) return;
    created.chapters = source.chapters.map((ch) => ({
      ...ch,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    }));
    const { doc, setDoc } = window.fb;
    await setDoc(doc(window.firebaseDb, "books", created.id), created);
    const idx = books.findIndex((b) => b.id === created.id);
    if (idx >= 0) books[idx] = created;
    selectedBookId = created.id;
    selectedChapterId = created.chapters[0]?.id || null;
    renderBooks();
    syncEditorFromSelection();
    setStatus("Proyecto guardado como copia");
  } else if (action === "open") {
    await confirmSaveIfNeeded();
    openProjectSelectorMenu();
  } else if (action === "closeProject") {
    await confirmSaveIfNeeded();
    selectedBookId = null;
    selectedChapterId = null;
    editor.innerHTML = "";
    chapterTitle.value = "";
    renderBooks();
    setStatus("Proyecto cerrado");
  } else if (action === "exit") {
    await confirmSaveIfNeeded();
    window.location.href = "/dashboard";
  }
}

async function handleEditAction(action) {
  const cmdMap = { undo: "undo", redo: "redo", cut: "cut", copy: "copy", selectAll: "selectAll" };
  if (action === "paste") {
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand("insertText", false, text);
    } catch {
      uiAlert("No se pudo pegar automáticamente. Usa Ctrl+V.");
    }
    return;
  }
  if (cmdMap[action]) document.execCommand(cmdMap[action], false, null);
}

function handleHelpAction(action) {
  if (action === "shortcuts") {
    uiAlert("Atajos:\nCtrl+S Guardar\nCtrl+B Negrita\nCtrl+I Itálica\nCtrl+U Subrayado");
  } else if (action === "about") {
    uiAlert("LibroAI Editor\nEscritura asistida con IA para crear, revisar y publicar libros.");
  }
}

function getModelMode() {
  const el = document.querySelector('input[name="aiTier"]:checked');
  return el && el.value === "sonnet" ? "sonnet" : "included";
}

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;
  const content = document.createElement("div");
  content.className = "message-content";
  // marked.js renderiza Markdown completo; fallback seguro si no carga
  if (typeof marked !== "undefined") {
    content.innerHTML = marked.parse(String(text || ""));
  } else {
    content.textContent = String(text || "");
  }
  wrapper.appendChild(content);

  // Botones de acción en cada mensaje de la IA
  if (role === "ai") {
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    actions.innerHTML = `
      <button class="btn btn-secondary btn-small" title="Añadir este texto al final del editor">⬇️ Añadir al final</button>
      <button class="btn btn-secondary btn-small" title="Reemplazar todo el texto del editor con este">🔄 Reemplazar todo</button>
    `;
    const btns = actions.querySelectorAll("button");
    
    // Función para obtener HTML limpio
    const getHtml = () => {
      const parts = String(text || "").split(/---/);
      let cleanText = parts.length > 1 
        ? parts.reduce((longest, current) => current.trim().length > longest.trim().length ? current : longest, "").trim()
        : String(text || "").trim();
      return typeof marked !== "undefined" 
        ? marked.parse(cleanText)
        : cleanText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    };

    btns[0].addEventListener("click", () => {
      const htmlText = getHtml();
      if (!htmlText) return;
      const currentContent = editor.innerHTML.trim();
      const prefix = currentContent ? "<br><br>" : "";
      editor.innerHTML += `${prefix}${htmlText}`;
      hasUnsavedChanges = true;
      saveCurrentChapter().then(() => {
        setStatus("✅ Contenido añadido al final y guardado");
        editor.scrollTop = editor.scrollHeight;
      });
    });

    btns[1].addEventListener("click", async () => {
      const htmlText = getHtml();
      if (!htmlText) return;
      if (await uiConfirm("¿Estás seguro de que quieres REEMPLAZAR todo el texto de este capítulo con la sugerencia de la IA?")) {
        editor.innerHTML = htmlText;
        hasUnsavedChanges = true;
        saveCurrentChapter().then(() => {
          setStatus("✅ Contenido reemplazado y guardado");
          editor.scrollTop = 0;
        });
      }
    });

    wrapper.appendChild(actions);
  }

  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


window.insertFormat = (cmd, val) => {
  if (editor.contentEditable === "false") return;
  document.execCommand(cmd, false, val);
  editor.focus();
};

function renderBooks() {
  bookList.innerHTML = "";
  chapterNav.innerHTML = "";
  
  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = `book-card ${book.id === selectedBookId ? "active" : ""}`;
    const title = document.createElement("p");
    title.className = "book-card-title";
    title.textContent = book.title;
    title.onclick = () => {
      selectedBookId = book.id;
      selectedChapterId = book.chapters[0]?.id || null;
      syncEditorFromSelection();
      renderBooks();
    };
    card.appendChild(title);

    const chapterList = document.createElement("div");
    chapterList.className = "chapter-list";
    book.chapters.forEach((chapter) => {
      // Sidebar item
      const btn = document.createElement("button");
      btn.className = `chapter-item ${
        book.id === selectedBookId && chapter.id === selectedChapterId ? "active" : ""
      }`;
      btn.textContent = chapter.title;
    btn.onclick = () => {
      selectedBookId = book.id;
      selectedChapterId = chapter.id;
      syncEditorFromSelection();
      renderBooks();
    };
    chapterList.appendChild(btn);

    // Top Nav Pill (only for selected book)
    if (book.id === selectedBookId) {
      const pill = document.createElement("div");
      pill.className = `nav-pill ${chapter.id === selectedChapterId ? "active" : ""}`;
      
      // Mostrar solo "Cap. X" o "Prólogo"
      let shortTitle = chapter.title.trim();
      const parts = shortTitle.split(/\s+/);
      const first = parts[0].toUpperCase();
      if (first.includes("PRÓLOGO")) {
        shortTitle = "Prólogo";
      } else if (first.includes("CAPÍTULO") || first.includes("CAPITULO")) {
        shortTitle = "Cap. " + (parts[1] || "").replace(/[:.\-]/g, "");
      } else if (shortTitle.length > 12) {
        shortTitle = shortTitle.substring(0, 12) + "...";
      }
      
      pill.textContent = shortTitle;
      pill.title = chapter.title; // Título completo al pasar el ratón
      pill.onclick = () => {
        selectedChapterId = chapter.id;
        syncEditorFromSelection();
        renderBooks();
      };
      chapterNav.appendChild(pill);
    }
  });
    card.appendChild(chapterList);
    bookList.appendChild(card);
  });
  // El botón de "Ver Todo" se maneja por su propio listener fijo
  refreshRecentProjectsMenu();
}

function syncEditorFromSelection() {
  const book = getSelectedBook();
  const chapter = getSelectedChapter();
  
  editor.contentEditable = "true";
  chapterTitle.disabled = false;
  saveBtn.disabled = false;

  if (!book) {
    editor.innerHTML = "";
    chapterTitle.value = "";
    return;
  }

  bookTitleInput.value = book.title;
  bookGenreInput.value = book.genre || "";
  bookAuthorInput.value = book.authorName || "";
  bookSynopsisInput.value = book.synopsis || "";

  if (book.coverUrl) {
    coverImg.src = book.coverUrl;
    bookCoverPreview.hidden = false;
    coverUploadStatus.textContent = "Imagen cargada";
  } else {
    bookCoverPreview.hidden = true;
    coverImg.src = "";
    coverUploadStatus.textContent = "Sin archivo";
  }

  if (!chapter) {
    // Si no hay capítulo seleccionado pero sí libro, limpiamos para evitar mostrar contenido viejo
    editor.innerHTML = "";
    chapterTitle.value = "";
    return;
  }

  editor.innerHTML = chapter.content || "";
  chapterTitle.value = chapter.title || "";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...fetchOpts,
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Error de red" }));
    const e = new Error(err.error || "Error inesperado");
    e.status = response.status;
    e.body = err;
    throw e;
  }
  return response.json();
}

async function refreshUsagePanel() {
  if (clientConfig.billingRelaxed) {
    usagePanel.hidden = true;
    if (sonnetBillingPanel) sonnetBillingPanel.hidden = true;
    return;
  }
  try {
    const u = await api("/api/billing/usage");

    // PRO: solo mostrar badge limpio, sin panel de tokens
    if (u.plan === "pro" || u.plan === "basic") {
      usagePanel.hidden = false;
      if (planNameBadge) planNameBadge.textContent = "PRO ✦";
      if (upgradeBtn) upgradeBtn.hidden = true;
      // Ocultar barra y resumen de tokens
      usageSummary.textContent = "Acceso ilimitado a todas las funciones.";
      usageBar.style.width = "100%";
      usageBar.classList.remove("usage-bar-warn", "usage-bar-danger");
      usageBar.style.background = "linear-gradient(90deg, #967117, #c9980a)";
      usageAlert.hidden = true;
      // Tracker superior: ocultar para PRO
      const usageTrackerEl = document.getElementById("usageTracker");
      if (usageTrackerEl) usageTrackerEl.style.display = "none";
      return;
    }

    // FREE: mostrar todo el panel de uso normal
    usagePanel.hidden = false;
    if (planNameBadge) planNameBadge.textContent = u.plan || "Free";
    if (upgradeBtn) {
      upgradeBtn.hidden = u.plan !== "free";
      upgradeBtn.textContent = "⚡ Hazte PRO";
    }
    const used = Number(u.included_tokens_used);
    const limit = Number(u.included_tokens_limit);
    const rem = Number(u.included_tokens_remaining);
    const pct = Math.min(100, Number(u.included_usage_percent) || 0);
    usageSummary.textContent = `Has usado ${used.toLocaleString("es-ES")} de ${limit.toLocaleString(
      "es-ES"
    )} tokens (${rem.toLocaleString("es-ES")} libres).`;
    usageBar.style.width = `${pct}%`;
    usageBar.style.background = "";

    // Sincronizar tracker superior
    if (trackerPlan) trackerPlan.textContent = u.plan || "Free";
    if (trackerValue) {
      const used = Number(u.included_tokens_used) || 0;
      const spent = Number(u.sonnet_monthly_spend_used) || 0;
      if (spent > 0) {
        trackerValue.textContent = `US$${spent.toFixed(2)} + ${used.toLocaleString("es-ES")} tok`;
      } else {
        trackerValue.textContent = `${used.toLocaleString("es-ES")} tok`;
      }
    }

    usageBar.classList.remove("usage-bar-warn", "usage-bar-danger");
    usageAlert.hidden = true;
    usageAlert.textContent = "";
    usageAlert.className = "usage-alert";
    if (u.included_blocked) {
      usageBar.classList.add("usage-bar-danger");
      usageAlert.hidden = false;
      usageAlert.classList.add("danger");
      usageAlert.textContent =
        "Llegaste al 100% de tus tokens del plan FREE. Hazte PRO para seguir escribiendo ahora mismo y desbloquear 3,000,000 tokens/mes.";
      if (upgradeBtn) {
        upgradeBtn.hidden = false;
        upgradeBtn.textContent = "🚀 Ver planes PRO";
      }
      if (shouldAutoOpenBlockedPlansModal()) {
        const plansModal = document.getElementById("plansModal");
        if (plansModal) plansModal.hidden = false;
        markBlockedPlansModalShownToday();
      }
    } else if (u.included_alert_80) {
      usageBar.classList.add("usage-bar-warn");
      usageAlert.hidden = false;
      usageAlert.classList.add("warn");
      usageAlert.textContent = "Has usado mas del 80% de tus tokens incluidos este mes.";
    }
    sonnetPaygToggle.checked = Boolean(u.sonnet_payg_enabled);
    sonnetSpendLimit.value =
      u.sonnet_monthly_spend_limit != null && u.sonnet_monthly_spend_limit !== ""
        ? String(u.sonnet_monthly_spend_limit)
        : "";
    const spent = Number(u.sonnet_monthly_spend_used) || 0;
    sonnetSpendSummary.textContent =
      "Gasto Sonnet este ciclo: US$" +
      spent.toFixed(4) +
      (u.sonnet_monthly_spend_limit != null
        ? " / limite US$" + Number(u.sonnet_monthly_spend_limit).toFixed(2)
        : "");
  } catch {
    usagePanel.hidden = true;
  }
}

async function ensureSession() {
  try {
    const r = await fetch("/api/auth/me", fetchOpts);
    const data = await r.json().catch(() => ({}));
    if (data && data.user != null) {
      const email = String(data.user.email || "").trim().toLowerCase();
      if (email === DEMO_SEED_EMAIL) {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        loginOverlay.hidden = false;
        return null;
      }
      loginOverlay.hidden = true;
      return data.user;
    }
  } catch {
    /* sin sesion o error de red */
  }
  loginOverlay.hidden = false;
  return null;
}

async function loadData() {
  setStatus("Cargando biblioteca...");
  if (!clientConfig.skipAuth) {
    const me = await ensureSession();
    if (!me) {
      setStatus("Inicia sesión para continuar.");
      return;
    }
    currentUserId = me.id;
    currentUser = me;  // guardar objeto completo para verificar plan
    loginOverlay.hidden = true;
  } else {
    currentUserId = 1; // Default for skipAuth
    loginOverlay.hidden = true;
  }

  // Fetch from Firestore
  try {
    const { collection, getDocs, query, where } = window.fb;
    const q = query(collection(window.firebaseDb, "books"), where("user_id", "==", currentUserId));
    const snap = await getDocs(q);
    books = [];
    snap.forEach(docSnap => {
      books.push(docSnap.data());
    });
    // Sort by updatedAt or createdAt if needed
    books.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (err) {
    console.error("Error fetching books:", err);
    setStatus("Error al cargar libros de Firestore.");
  }

  const trialNote = (clientConfig.billingRelaxed || clientConfig.skipAuth)
    ? "Modo prueba: sin login, sin cupos ni cobros registrados."
    : "Sincronizado con la nube.";

  renderBooks();
  syncEditorFromSelection();
  await refreshUsagePanel();

  // Siempre mostrar el selector inicial al cargar
  onboardingOverlay.hidden = false;
  resetOnboarding();

  if (books.length > 0) {
    selectedBookId = books[0].id;
    selectedChapterId = books[0].chapters[0]?.id || null;
    syncEditorFromSelection();
    renderBooks();
  }
  
  if (books.length > 0) {
    setStatus("Selecciona o crea un libro.");
  } else {
    setStatus("Bienvenido. Crea tu primer libro.");
  }
}

async function saveCurrentChapter() {
  const book = getSelectedBook();
  const chapter = getSelectedChapter();
  if (!book || !chapter) return;
  setStatus("💾 Guardando...");

  chapter.title = chapterTitle.value;
  chapter.content = editor.innerHTML;
  chapter.updatedAt = new Date().toISOString();
  book.updatedAt = new Date().toISOString();

  try {
    const { doc, setDoc } = window.fb;
    await setDoc(doc(window.firebaseDb, "books", book.id), book);
    hasUnsavedChanges = false;
    renderBooks();
    setStatus("✓ Guardado");
  } catch (err) {
    console.error(err);
    setStatus("⚠️ Error al guardar en Firestore");
  }
}

async function saveBookMeta() {
  const book = getSelectedBook();
  if (!book) return;
  setStatus("Guardando libro...");

  book.title = bookTitleInput.value.trim() || book.title;
  book.genre = bookGenreInput.value.trim();
  book.authorName = bookAuthorInput.value.trim();
  book.synopsis = bookSynopsisInput.value;
  // El coverUrl ya se actualiza en el objeto 'book' por el listener de subida
  book.updatedAt = new Date().toISOString();

  try {
    const { doc, setDoc } = window.fb;
    await setDoc(doc(window.firebaseDb, "books", book.id), book);
    renderBooks();
    setStatus("Datos del libro guardados");
  } catch (err) {
    console.error(err);
    setStatus("Error al guardar metadatos");
  }
}

function scheduleBookMetaSave(delayMs = 500) {
  const book = getSelectedBook();
  if (!book) return;
  clearTimeout(bookMetaSaveTimer);
  bookMetaSaveTimer = setTimeout(() => {
    saveBookMeta().catch((error) => setStatus(error.message || "Error al guardar metadatos"));
  }, delayMs);
}

async function createBook(manualTitle, manualGenre, manualAuthor) {
  const title = manualTitle || (await uiPrompt("Titulo del nuevo libro:", ""));
  if (!title) return;
  setStatus("Creando libro...");
  
  const now = new Date().toISOString();
  const book = {
    id: crypto.randomUUID(),
    user_id: currentUserId,
    title: title.trim(),
    genre: manualGenre || "",
    authorName: manualAuthor || "",
    synopsis: "",
    createdAt: now,
    updatedAt: now,
    chapters: [
      {
        id: crypto.randomUUID(),
        title: "Capitulo 1",
        content: "",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };

  try {
    const { doc, setDoc } = window.fb;
    await setDoc(doc(window.firebaseDb, "books", book.id), book);
    books.unshift(book);
    selectedBookId = book.id;
    selectedChapterId = book.chapters[0]?.id || null;
    renderBooks();
    syncEditorFromSelection();
    setStatus("Libro creado");
    return book;
  } catch (err) {
    console.error(err);
    setStatus("Error al crear libro en Firestore");
  }
}

async function createChapter() {
  const book = getSelectedBook();
  if (!book) return;
  setStatus("Creando capitulo...");

  const now = new Date().toISOString();
  const chapter = {
    id: crypto.randomUUID(),
    title: `Capitulo ${book.chapters.length + 1}`,
    content: "",
    createdAt: now,
    updatedAt: now,
  };
  
  book.chapters.push(chapter);
  book.updatedAt = now;

  try {
    const { doc, setDoc } = window.fb;
    await setDoc(doc(window.firebaseDb, "books", book.id), book);
    selectedChapterId = chapter.id;
    renderBooks();
    syncEditorFromSelection();
    setStatus("Capitulo creado");
  } catch (err) {
    console.error(err);
    setStatus("Error al crear capitulo");
  }
}

function buildGeneratePayload(promptText) {
  const book = getSelectedBook();
  const chapter = getSelectedChapter();
  return {
    prompt: promptText,
    chapterText: chapter?.content || editor.innerText,
    bookTitle: book?.title || "",
    genre: book?.genre || "",
    authorName: book?.authorName || "",
    synopsis: book?.synopsis || "",
    modelMode: getModelMode(),
    requestType: requestTypeEl.value || "auto",
  };
}

async function postGenerate(payload) {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    ...fetchOpts,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Error ${response.status}`);
    err.status = response.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function postEstimate(payload) {
  const response = await fetch("/api/ai/estimate-cost", {
    method: "POST",
    ...fetchOpts,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo estimar el coste.");
  return data;
}

function updateSonnetPreview() {
  if (clientConfig.billingRelaxed) {
    sonnetCostPreview.hidden = true;
    sonnetCostPreview.textContent = "";
    return;
  }
  const mode = getModelMode();
  if (mode !== "sonnet") {
    sonnetCostPreview.hidden = true;
    sonnetCostPreview.textContent = "";
    return;
  }
  const p = chatInput.value.trim();
  if (!p) {
    sonnetCostPreview.hidden = true;
    return;
  }
  postEstimate(buildGeneratePayload(p))
    .then((est) => {
      sonnetCostPreview.hidden = false;
      sonnetCostPreview.textContent = `Estimacion (max. aprox.): US$${est.estimated_charge_usd_max} — Input US$6/1M, Output US$30/1M. Confirma al enviar.`;
    })
    .catch(() => {
      sonnetCostPreview.hidden = true;
    });
}

let previewTimer = null;
chatInput.addEventListener("input", () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updateSonnetPreview, 400);
});

document.querySelectorAll('input[name="aiTier"]').forEach((r) => {
  r.addEventListener("change", () => {
    updateSonnetPreview();
    if (sonnetBillingPanel) {
      sonnetBillingPanel.hidden = r.value !== "sonnet" || clientConfig.billingRelaxed;
    }
  });
});

function exportBook() {
  const book = getSelectedBook();
  if (!book) return;
  
  const md = [
    `# ${book.title}`,
    "",
    book.synopsis ? `> ${book.synopsis}` : "",
    "",
    ...book.chapters.flatMap((ch) => [`## ${ch.title}`, "", ch.content || "", ""]),
  ].join("\n");

  const blob = new Blob([md], { type: "text/markdown; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${book.title.replace(/[^\w\-]+/g, "_")}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

saveBtn.addEventListener("click", () => {
  saveCurrentChapter().catch((error) => setStatus(error.message));
});

publishBtn.addEventListener("click", async () => {
  const book = getSelectedBook();
  if (!book) return;
  openPublishModal();
});

saveBookMetaBtn.addEventListener("click", () => {
  saveBookMeta().catch((error) => setStatus(error.message));
});

bookTitleInput?.addEventListener("input", () => scheduleBookMetaSave(450));
bookGenreInput?.addEventListener("input", () => scheduleBookMetaSave(550));
bookAuthorInput?.addEventListener("input", () => scheduleBookMetaSave(550));
bookSynopsisInput?.addEventListener("input", () => scheduleBookMetaSave(700));

bookTitleInput?.addEventListener("blur", () => scheduleBookMetaSave(0));
bookTitleInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    scheduleBookMetaSave(0);
  }
});

desktopMenuBar?.addEventListener("click", async (e) => {
  const disabledBtn = e.target.closest("button:disabled");
  if (disabledBtn) {
    e.preventDefault();
    return;
  }
  const trigger = e.target.closest(".desktop-menu-trigger");
  if (trigger) {
    const item = trigger.closest(".desktop-menu-item");
    const alreadyOpen = item.classList.contains("open");
    closeDesktopMenus();
    if (!alreadyOpen) {
      item.classList.add("open");
      if (item.dataset.menu === "file") refreshRecentProjectsMenu();
      moveMenuKeyboardSelection(0);
    }
    return;
  }

  const fileAction = e.target.closest("[data-file-action]")?.getAttribute("data-file-action");
  if (fileAction) {
    await handleFileAction(fileAction);
    closeDesktopMenus();
    return;
  }

  const editAction = e.target.closest("[data-edit-action]")?.getAttribute("data-edit-action");
  if (editAction) {
    await handleEditAction(editAction);
    closeDesktopMenus();
    return;
  }

  const helpAction = e.target.closest("[data-help-action]")?.getAttribute("data-help-action");
  if (helpAction) {
    handleHelpAction(helpAction);
    closeDesktopMenus();
  }
});

triggerCoverUpload.addEventListener("click", () => bookCoverFile.click());

bookCoverFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const book = getSelectedBook();
  if (!book) {
    uiAlert("Selecciona un libro antes de subir una portada.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    coverUploadStatus.textContent = "Subiendo...";
    const res = await fetch("/api/media/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir");

    // Guardar URL (usamos el proxy para verla)
    const proxyUrl = `/api/media/serve/${data.fileName}`;
    book.coverUrl = proxyUrl;
    
    // Mostrar preview
    coverImg.src = proxyUrl;
    bookCoverPreview.hidden = false;
    coverUploadStatus.textContent = "✓ Subido";
    
    // Guardar en Firestore inmediatamente
    await saveBookMeta();
    setStatus("Portada actualizada.");
    if (publishOverlay && !publishOverlay.hidden) {
      refreshPublishCoverState();
    }
  } catch (err) {
    console.error(err);
    coverUploadStatus.textContent = "Error";
    uiAlert("No se pudo subir la imagen: " + err.message);
  }
});

removeCoverBtn.addEventListener("click", async () => {
  const book = getSelectedBook();
  if (!book) return;
  
  if (await uiConfirm("¿Quitar la portada de este libro?")) {
    book.coverUrl = null;
    bookCoverPreview.hidden = true;
    coverImg.src = "";
    coverUploadStatus.textContent = "Sin archivo";
    await saveBookMeta();
    if (publishOverlay && !publishOverlay.hidden) {
      refreshPublishCoverState();
    }
  }
});

publishUploadCoverBtn?.addEventListener("click", () => {
  bookCoverFile.click();
});

publishCancelBtn?.addEventListener("click", () => {
  closePublishModal();
});

publishOverlay?.addEventListener("click", (e) => {
  if (e.target === publishOverlay) closePublishModal();
});

publishConfirmBtn?.addEventListener("click", async () => {
  const book = getSelectedBook();
  if (!book) return;

  const authorName = publishAuthorInput.value.trim();
  const priceUsd = Number(publishPriceInput.value);
  const category = publishCategoryInput.value.trim() || "General";
  const language = publishLanguageInput.value.trim() || "es";
  const tags = publishTagsInput.value.trim();

  if (!authorName) {
    setPublishError("El autor es obligatorio para publicar.");
    return;
  }
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    setPublishError("El precio debe ser un número válido mayor o igual a 0.");
    return;
  }
  if (!book.coverUrl) {
    setPublishError("Sube una portada antes de publicar.");
    return;
  }

  try {
    setPublishError("");
    setStatus("Guardando metadatos de publicación...");
    publishConfirmBtn.disabled = true;
    publishConfirmBtn.textContent = "Publicando...";
    publishBtn.disabled = true;

    // Guardar metadatos en el libro base antes de publicar
    book.authorName = authorName;
    book.price = Math.round(priceUsd * 100);
    book.category = category;
    book.language = language;
    book.tags = tags;
    bookAuthorInput.value = authorName;
    await saveBookMeta();

    const res = await fetch(`/api/publish/${book.id}/publish`, {
      method: "POST",
      ...fetchOpts,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        language,
        tags,
        price: Math.round(priceUsd * 100),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo publicar.");

    closePublishModal();
    setStatus("Libro publicado");
    uiAlert("¡Libro publicado con éxito! Ya está visible en Marketplace.");
    window.open("/libroia/marketplace.html", "_blank");
  } catch (err) {
    setPublishError(err.message || "Error al publicar.");
    setStatus("Error al publicar");
  } finally {
    publishConfirmBtn.disabled = false;
    publishConfirmBtn.textContent = "Publicar ahora";
    publishBtn.disabled = false;
  }
});

newBookBtn?.addEventListener("click", () => {
  resetOnboarding();
  onboardingOverlay.hidden = false;
});

// Onboarding Listeners
obNewBookBtn.addEventListener("click", () => showOnboardingStep(1));
obOpenBookBtn.addEventListener("click", () => openProjectSelectorMenu());

document.querySelectorAll(".ob-next").forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentObStep === 1 && !obBookTitle.value.trim()) {
      uiAlert("¡Por favor, ponle un título a tu libro!");
      return;
    }
    showOnboardingStep(currentObStep + 1);
  });
});

document.querySelectorAll(".ob-back").forEach(btn => {
  btn.addEventListener("click", () => showOnboardingStep(currentObStep - 1));
});

document.querySelectorAll('input[name="obGenre"]').forEach(radio => {
  radio.addEventListener("change", (e) => {
    obGenreOther.hidden = e.target.value !== "Otro";
    if (e.target.value === "Otro") obGenreOther.focus();
  });
});

obFinishBtn.addEventListener("click", finishOnboarding);


newChapterBtn?.addEventListener("click", () => {
  createChapter().catch((error) => setStatus(error.message));
});

exportBtn?.addEventListener("click", exportBook);

magicSplitBtn.addEventListener("click", async () => {
  const text = editor.innerText;
  const isFullView = !selectedChapterId;
  
  // Regex para detectar títulos tipo "Capítulo 1", "CAPÍTULO I", "Prólogo", etc.
  const chapterRegex = /(?:^|\n)(?:#+)?\s*(PRÓLOGO|CAPÍTULO|Capítulo|Sección)\s*(\d+|[IVXLC]+)?(?:[:.\-]*)\s*([^\n]*)/gi;
  
  const sections = [];
  let lastIndex = 0;
  let match;
  
  while ((match = chapterRegex.exec(text)) !== null) {
    if (sections.length > 0) {
      sections[sections.length - 1].content = text.substring(lastIndex, match.index).trim();
    }
    const fullTitle = match[0].trim().replace(/^#+\s*/, "");
    sections.push({
      title: fullTitle,
      startIndex: match.index
    });
    lastIndex = match.index + match[0].length;
  }
  
  if (sections.length > 0) {
    sections[sections.length - 1].content = text.substring(lastIndex).trim();
  }

  if (sections.length < 2 && !isFullView) {
    uiAlert("No se detectaron capítulos adicionales (ej: 'Capítulo 2'). Asegúrate de escribir los títulos en líneas separadas.");
    return;
  }

  let confirmMsg = `He detectado ${sections.length} secciones:\n${sections.map(s => "- " + s.title).join("\n")}\n\n¿Quieres organizar tu libro?`;
  if (isFullView) {
    confirmMsg += "\n\n⚠️ ATENCIÓN: Estás en vista completa. Esto REEMPLAZARÁ todos los capítulos actuales por estos nuevos.";
  }

  const ok = await uiConfirm(confirmMsg);
  
  if (ok) {
    const book = getSelectedBook();
    if (!book) return;
    
    setStatus("Organizando capítulos...");
    const now = new Date().toISOString();
    
    if (isFullView) {
      // Reemplazar todo
      book.chapters = sections.map((s, i) => ({
        id: crypto.randomUUID(),
        title: s.title,
        content: s.content,
        createdAt: now,
        updatedAt: now
      }));
      selectedChapterId = book.chapters[0]?.id || null;
    } else {
      // El comportamiento anterior: actualizar actual y añadir nuevos
      const currentChapter = getSelectedChapter();
      if (currentChapter && sections[0]) {
        currentChapter.title = sections[0].title;
        currentChapter.content = sections[0].content;
        currentChapter.updatedAt = now;
      }
      for (let i = 1; i < sections.length; i++) {
        book.chapters.push({
          id: crypto.randomUUID(),
          title: sections[i].title,
          content: sections[i].content,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    
    book.updatedAt = now;
    
    try {
      const { doc, setDoc } = window.fb;
      await setDoc(doc(window.firebaseDb, "books", book.id), book);
      renderBooks();
      syncEditorFromSelection();
      setStatus("¡Libro reorganizado con éxito! ✨");
    } catch (err) {
      console.error(err);
      setStatus("Error al organizar capítulos");
    }
  }
});

viewAllBtn.addEventListener("click", () => {
  const book = getSelectedBook();
  if (!book) {
    uiAlert("Selecciona un libro primero.");
    return;
  }
  
  // Generar texto completo
  const fullText = book.chapters.map(c => `<div class="full-view-chapter"><h2>${c.title}</h2>${c.content || "(vacío)"}</div>`).join("<hr>");
  
  selectedChapterId = null; // Deseleccionar capítulo para entrar en modo "Ver Todo"
  editor.innerHTML = fullText;
  chapterTitle.value = "📚 VISTA COMPLETA (Edición libre)";
  
  // PERMITIR edición para que el usuario pueda limpiar y luego usar la varita mágica
  editor.readOnly = false;
  chapterTitle.disabled = true;
  saveBtn.disabled = true;
  
  renderBooks(); // Refrescar para quitar el active de los pills
  setStatus("Viendo el libro completo. Puedes editar aquí y luego usar 🪄 Organizar.");
});

wipeChaptersBtn.addEventListener("click", async () => {
  const book = getSelectedBook();
  if (!book) return;

  const currentText = editor.innerHTML;
  if (!currentText.trim() || currentText === "(vacío)") {
    uiAlert("El editor está vacío. No hay nada que limpiar.");
    return;
  }

  const ok = await uiConfirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará todos los capítulos actuales, pero CREARÁ UN RESPALDO con todo tu texto actual para que no se pierda nada.\n\nPodrás usar ese respaldo para reorganizar el libro con la 'Varita Mágica'.");
  
  if (ok) {
    setStatus("Limpiando y creando respaldo...");
    const now = new Date().toISOString();
    
    // Crear un único capítulo con todo el contenido como respaldo
    book.chapters = [{
      id: crypto.randomUUID(),
      title: "Respaldo Completo - " + new Date().toLocaleTimeString(),
      content: currentText,
      createdAt: now,
      updatedAt: now
    }];
    
    book.updatedAt = now;
    
    try {
      const { doc, setDoc } = window.fb;
      await setDoc(doc(window.firebaseDb, "books", book.id), book);
      
      selectedChapterId = book.chapters[0].id;
      renderBooks();
      syncEditorFromSelection();
      setStatus("Estructura limpia. Tienes tu texto en el capítulo de 'Respaldo'. Úsalo para Organizar. ✨");
    } catch (err) {
      console.error(err);
      setStatus("Error al limpiar estructura.");
    }
  }
});

previewBtn.addEventListener("click", () => {
  renderPreview();
  previewOverlay.hidden = false;
});

closePreviewBtn.addEventListener("click", () => {
  previewOverlay.hidden = true;
});

printBtn.addEventListener("click", () => {
  window.print();
});

realBookBtn?.addEventListener("click", async () => {
  const book = getSelectedBook();
  if (!book) {
    uiAlert("Selecciona o crea un libro primero.");
    return;
  }
  updateRealBookSoundButton();
  if (realBookOverlay) realBookOverlay.hidden = false;
  if (realBookPage) {
    realBookPage.innerHTML = '<div class="realbook-loading">Generando PDF del libro...</div>';
  }
  try {
    const pdfBuffer = await buildBookPdfBuffer(book);
    await renderPdfFlipbook(pdfBuffer);
  } catch (err) {
    console.error(err);
    if (realBookPage) {
      realBookPage.innerHTML = '<div class="realbook-loading">No se pudo construir el flipbook PDF.</div>';
    }
    uiAlert("No se pudo crear el visor real en PDF.");
  }
});

closeRealBookBtn?.addEventListener("click", () => {
  if (realBookOverlay) realBookOverlay.hidden = true;
  realBookNavLock = false;
  if (realBookFlip) {
    try { realBookFlip.destroy(); } catch {}
    realBookFlip = null;
  }
  if (realBookPage) realBookPage.innerHTML = "";
});

realBookPrevBtn?.addEventListener("click", () => {
  goRealBookPrev();
});

realBookNextBtn?.addEventListener("click", () => {
  goRealBookNext();
});

realBookClickPrev?.addEventListener("click", () => goRealBookPrev());
realBookClickNext?.addEventListener("click", () => goRealBookNext());

realBookSoundBtn?.addEventListener("click", () => {
  realBookSoundEnabled = !realBookSoundEnabled;
  try {
    localStorage.setItem(REALBOOK_SOUND_KEY, realBookSoundEnabled ? "1" : "0");
  } catch {
    // Ignore storage issues.
  }
  updateRealBookSoundButton();
});

document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;

  if (e.key === "Escape") closeDesktopMenus();

  if (mod && e.key.toLowerCase() === "n") {
    e.preventDefault();
    handleFileAction("new");
    closeDesktopMenus();
  } else if (mod && e.key.toLowerCase() === "o") {
    e.preventDefault();
    handleFileAction("open");
    closeDesktopMenus();
  } else if (mod && e.shiftKey && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (getSelectedBook()) handleFileAction("saveAs").catch((error) => setStatus(error.message));
    closeDesktopMenus();
  } else if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (getSelectedBook()) saveCurrentChapter().catch((error) => setStatus(error.message));
    closeDesktopMenus();
  } else if (mod && e.key.toLowerCase() === "q") {
    e.preventDefault();
    handleFileAction("exit");
    closeDesktopMenus();
  } else if (mod && e.key.toLowerCase() === "w") {
    e.preventDefault();
    if (getSelectedBook()) handleFileAction("closeProject");
    closeDesktopMenus();
  }

  const openItem = getOpenDesktopMenuItem();
  if (openItem) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveMenuKeyboardSelection(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveMenuKeyboardSelection(-1);
      return;
    }
    if (e.key === "Enter") {
      const activeBtn = openItem.querySelector(".desktop-menu-dropdown button.menu-kbd-active");
      if (activeBtn) {
        e.preventDefault();
        activeBtn.click();
      }
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const order = ["file", "edit", "help"];
      const idx = order.indexOf(openItem.dataset.menu || "file");
      const next = e.key === "ArrowRight" ? order[(idx + 1) % order.length] : order[(idx - 1 + order.length) % order.length];
      openDesktopMenu(next);
      return;
    }
  } else if (e.altKey && !mod) {
    const k = e.key.toLowerCase();
    if (k === "f") { e.preventDefault(); openDesktopMenu("file"); return; }
    if (k === "e") { e.preventDefault(); openDesktopMenu("edit"); return; }
    if (k === "h") { e.preventDefault(); openDesktopMenu("help"); return; }
  }

  if (!realBookOverlay || realBookOverlay.hidden) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    goRealBookPrev();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    goRealBookNext();
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeRealBookBtn?.click();
  }
});

document.addEventListener("click", (e) => {
  if (!desktopMenuBar) return;
  if (!desktopMenuBar.contains(e.target)) closeDesktopMenus();
});

function renderPreview() {
  const book = getSelectedBook();
  if (!book) return;

  previewContent.innerHTML = "";
  
  // Title Page
  const titlePage = document.createElement("div");
  titlePage.className = "book-page";
  titlePage.innerHTML = `
    <h1>${book.title}</h1>
    <h3 style="text-align:center; margin-top: 50px; font-family: 'Lora'">${book.authorName || ""}</h3>
    <div style="text-align:center; margin-top: 100px; color: #666; font-style: italic; font-family: 'Lora'">${book.genre || ""}</div>
  `;
  previewContent.appendChild(titlePage);

  let pageNum = 1;

  book.chapters.forEach((ch) => {
    const chPage = document.createElement("div");
    chPage.className = "book-page";
    chPage.innerHTML = `
      <h2>${ch.title}</h2>
      <div class="page-content">${ch.content || ""}</div>
      <div class="page-number">${pageNum++}</div>
    `;
    previewContent.appendChild(chPage);
  });
}

upgradeBtn.addEventListener("click", () => {
  const plansModal = document.getElementById("plansModal");
  if (plansModal) plansModal.hidden = false;
});

// Cerrar modal de planes
document.getElementById("plansCloseBtn")?.addEventListener("click", () => {
  document.getElementById("plansModal").hidden = true;
});
document.getElementById("plansModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("plansModal")) {
    document.getElementById("plansModal").hidden = true;
  }
});

// Pagar PRO con Stripe (mensual o anual)
async function startProCheckout(interval, btnId, loadingLabel) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = "Redirigiendo...";
  btn.disabled = true;
  try {
    const res = await fetch("/api/payments/create-subscription-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ interval }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      uiAlert(data.error || "Error al iniciar el pago");
      btn.textContent = loadingLabel;
      btn.disabled = false;
    }
  } catch (err) {
    uiAlert("Error de conexión");
    btn.textContent = loadingLabel;
    btn.disabled = false;
  }
}

document.getElementById("payProMonthlyBtn")?.addEventListener("click", async () => {
  await startProCheckout("month", "payProMonthlyBtn", "💳 Pagar mensual");
});

document.getElementById("payProYearlyBtn")?.addEventListener("click", async () => {
  await startProCheckout("year", "payProYearlyBtn", "💳 Pagar anual (20% OFF)");
});



continueBtn.addEventListener("click", () => {
  chatInput.value = "Excelente, continúa con el siguiente bloque del capítulo por favor.";
  chatForm.dispatchEvent(new Event("submit"));
});

authTabLogin.addEventListener("click", () => setAuthTab("login"));
authTabRegister.addEventListener("click", () => setAuthTab("register"));
setAuthTab("login");

if (googleSignInBtn) {
  googleSignInBtn.addEventListener("click", () => {
    handleFirebaseGoogleSignIn();
  });
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) return;
  if (authMode === "register") {
    if (password !== authPassword2.value) {
      setStatus("Las contraseñas no coinciden.");
      return;
    }
  }
  try {
    const path = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const r = await fetch(path, {
      method: "POST",
      ...fetchOpts,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Error de autenticación");
    loginOverlay.hidden = true;
    chatMessages.innerHTML = "";
    await loadData().catch((err) => setStatus(err.message));
    setStatus(authMode === "register" ? "Cuenta creada. Listo." : "Sesión iniciada.");
  } catch (err) {
    setStatus(err.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", ...fetchOpts });
  window.location.href = "/";
});

saveSonnetBillingBtn.addEventListener("click", async () => {
  const enabled = sonnetPaygToggle.checked;
  const raw = sonnetSpendLimit.value.trim();
  const monthlyLimitUsd = raw === "" ? null : Number(raw);
  try {
    await api("/api/billing/sonnet-payg", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, monthlyLimitUsd }),
    });
    await refreshUsagePanel();
    setStatus("Preferencias Sonnet guardadas.");
  } catch (e) {
    setStatus(e.message);
  }
});



chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addMessage("user", text);
  chatInput.value = "";
  const payload = buildGeneratePayload(text);
  const mode = payload.modelMode;
  setStatus(mode === "sonnet" ? "Generando con Sonnet PRO..." : "Generando (plan incluido)...");

  try {
    if (mode === "sonnet" && !clientConfig.billingRelaxed) {
      const est = await postEstimate(payload);
      const ok = await uiConfirm(
        `Sonnet PRO: coste maximo estimado ~ US$${est.estimated_charge_usd_max}. ¿Continuar?`
      );
      if (!ok) {
        setStatus("Cancelado.");
        return;
      }
    }

    const response = await postGenerate(payload);
    lastSuggestion = response.text || "";
    addMessage("ai", response.text);
    if (
      !clientConfig.billingRelaxed &&
      response.alerts?.included_over_80_percent &&
      !response.alerts?.included_over_100_percent
    ) {
      addMessage("ai", "Aviso: mas del 80% de tokens incluidos usados este mes.");
    }
    await refreshUsagePanel();
    setStatus("Listo");
  } catch (error) {
    if (error.status === 402) {
      addMessage(
        "ai",
        "Sonnet PRO no esta incluido en tu plan. Activa pago por uso para usar este modelo premium."
      );
    } else if (error.status === 403) {
      addMessage(
        "ai",
        error.message ||
          "Has alcanzado los 3,000,000 tokens incluidos de tu plan mensual. Puedes esperar al proximo ciclo o usar Sonnet PRO con pago por uso."
      );
    } else {
      addMessage("ai", error.message || "Error de IA.");
    }
    setStatus(error.message || "Error");
  }
});

let autoSaveTimer = null;
editor.addEventListener("input", () => {
  hasUnsavedChanges = true;
  setStatus("✏️ Sin guardar...");
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveCurrentChapter().catch(() => {});
  }, 1500);
});

// Avisa al usuario si intenta cerrar con cambios sin guardar
window.addEventListener("beforeunload", (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = "";
  }
});


chapterTitle.addEventListener("change", () => {
  saveCurrentChapter().catch((error) => setStatus(error.message));
});

async function startApp() {
  await loadClientConfig();
  
  // Esperar a que Firebase esté cargado (si no es modo skipAuth)
  if (!clientConfig.skipAuth) {
    let attempts = 0;
    while (!window.fb && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
  }

  if (clientConfig.skipAuth) {
    loadData().catch((error) => {
      setStatus(error.message);
      addMessage("ai", error.message);
    });
    return;
  }
  
  ensureSession().then((me) => {
    if (me) {
      if (me.user) {
        const u = me.user;
        if (u.avatar_url) {
          document.getElementById('topbarAvatar').src = u.avatar_url;
        } else {
          document.getElementById('topbarAvatar').src = `https://ui-avatars.com/api/?name=${u.email}&background=641220&color=fff`;
        }
      }
      loadData().catch((error) => {
        setStatus(error.message);
        addMessage("ai", error.message);
      });
    } else {
      setStatus("Inicia sesión.");
    }
  });
}

startApp();
