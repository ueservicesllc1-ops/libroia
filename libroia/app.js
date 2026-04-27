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
const BLOCKED_PLANS_MODAL_KEY = "libroai_blocked_plans_modal_last_shown";

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
function requireProUI() {
  if (currentUser && (currentUser.plan === 'pro' || currentUser.is_admin)) return true;
  // Abrir modal de planes
  const plansModal = document.getElementById('plansModal');
  if (plansModal) plansModal.hidden = false;
  return false;
}

// Botón: Revisar Capítulo [PRO]
document.getElementById("aiReviseChapterBtn")?.addEventListener("click", async () => {
  if (!requireProUI()) return;
  const content = editor.innerHTML;
  if (!content || content.length < 50) return alert("Escribe un poco más para poder revisar.");
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
    alert("Error: " + err.message);
    setStatus("Error en revisión");
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
    alert("Error: " + err.message);
    setStatus("Error en organización");
  }
});

revCancelBtn?.addEventListener("click", () => {
  revOverlay.hidden = true;
  currentRevisionData = null;
});

revApplyBtn?.addEventListener("click", () => {
  if (currentRevisionData) {
    editor.innerHTML = currentRevisionData.content;
    saveCurrentChapter(); 
    revOverlay.hidden = true;
    currentRevisionData = null;
    alert("Cambios aplicados correctamente.");
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
    alert("Por favor, ponle un título a tu libro.");
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

    btns[1].addEventListener("click", () => {
      const htmlText = getHtml();
      if (!htmlText) return;
      if (confirm("¿Estás seguro de que quieres REEMPLAZAR todo el texto de este capítulo con la sugerencia de la IA?")) {
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

async function createBook(manualTitle, manualGenre, manualAuthor) {
  const title = manualTitle || prompt("Titulo del nuevo libro:");
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

triggerCoverUpload.addEventListener("click", () => bookCoverFile.click());

bookCoverFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const book = getSelectedBook();
  if (!book) {
    alert("Selecciona un libro antes de subir una portada.");
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
    alert("No se pudo subir la imagen: " + err.message);
  }
});

removeCoverBtn.addEventListener("click", async () => {
  const book = getSelectedBook();
  if (!book) return;
  
  if (confirm("¿Quitar la portada de este libro?")) {
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
    alert("¡Libro publicado con éxito! Ya está visible en Marketplace.");
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
obOpenBookBtn.addEventListener("click", () => {
  if (books.length > 0) {
    obBookSelectorList.innerHTML = "";
    books.forEach(book => {
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
        document.body.classList.remove('is-loading');
        syncEditorFromSelection();
        renderBooks();
        addMessage("ai", `¡Excelente elección! 👋 He cargado **"${book.title}"**. ¿Qué te gustaría trabajar ahora?`);
      };
      obBookSelectorList.appendChild(item);
    });
    showOnboardingStep("obStepOpen");
  } else {
    alert("No encontramos proyectos guardados en tu cuenta. Vamos a crear uno nuevo.");
    showOnboardingStep(1);
  }
});

document.querySelectorAll(".ob-next").forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentObStep === 1 && !obBookTitle.value.trim()) {
      alert("¡Por favor, ponle un título a tu libro!");
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
    alert("No se detectaron capítulos adicionales (ej: 'Capítulo 2'). Asegúrate de escribir los títulos en líneas separadas.");
    return;
  }

  let confirmMsg = `He detectado ${sections.length} secciones:\n${sections.map(s => "- " + s.title).join("\n")}\n\n¿Quieres organizar tu libro?`;
  if (isFullView) {
    confirmMsg += "\n\n⚠️ ATENCIÓN: Estás en vista completa. Esto REEMPLAZARÁ todos los capítulos actuales por estos nuevos.";
  }

  const ok = confirm(confirmMsg);
  
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
    alert("Selecciona un libro primero.");
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
    alert("El editor está vacío. No hay nada que limpiar.");
    return;
  }

  const ok = confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará todos los capítulos actuales, pero CREARÁ UN RESPALDO con todo tu texto actual para que no se pierda nada.\n\nPodrás usar ese respaldo para reorganizar el libro con la 'Varita Mágica'.");
  
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
      alert(data.error || "Error al iniciar el pago");
      btn.textContent = loadingLabel;
      btn.disabled = false;
    }
  } catch (err) {
    alert("Error de conexión");
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
      const ok = window.confirm(
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
