const bookGrid = document.getElementById("bookGrid");
const tabMarket = document.getElementById("tabMarket");
const tabLibrary = document.getElementById("tabLibrary");
const purchaseModal = document.getElementById("purchaseModal");
const purchaseBookTitle = document.getElementById("purchaseBookTitle");
const buyPdfOption = document.getElementById("buyPdfOption");
const buyPhysicalOption = document.getElementById("buyPhysicalOption");
const purchaseHint = document.getElementById("purchaseHint");
const addToCartConfirmBtn = document.getElementById("addToCartConfirmBtn");
const closePurchaseModalBtn = document.getElementById("closePurchaseModalBtn");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const cartItemsWrap = document.getElementById("cartItemsWrap");
const cartTotals = document.getElementById("cartTotals");
const cartCount = document.getElementById("cartCount");
const checkoutPdfBtn = document.getElementById("checkoutPdfBtn");
const checkoutPhysicalBtn = document.getElementById("checkoutPhysicalBtn");

let currentView = "market";
let currentUser = null;
const publicCfg = { physicalShippingCents: 999 };
let selectedBookForPurchase = null;
let selectedFormat = "pdf";
const CART_KEY = "libroai_marketplace_cart_v1";

async function loadMarketplace() {
    try {
        const res = await fetch("/api/marketplace");
        const books = await res.json();
        renderGrid(books);
    } catch (err) {
        console.error(err);
    }
}

async function loadLibrary() {
    try {
        const res = await fetch("/api/buyer/library");
        if (!res.ok) {
            renderGrid([], true, "Inicia sesión para ver tus libros comprados.");
            return;
        }
        const books = await res.json();
        renderGrid(books, true);
    } catch (err) {
        console.error(err);
    }
}

function getPriceUSD(book) {
    const cents = Number(book.price || 0);
    return cents > 0 ? (cents / 100) : 0;
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
        return [];
    }
}

function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
}

function addToCart(item) {
    const cart = getCart();
    const exists = cart.find((c) => c.book_id === item.book_id && c.format === item.format);
    if (!exists) cart.push(item);
    setCart(cart);
}

function removeFromCart(bookId, format) {
    setCart(getCart().filter((i) => !(i.book_id === bookId && i.format === format)));
}

function renderCart() {
    const cart = getCart();
    cartCount.textContent = String(cart.length);
    if (!cart.length) {
        cartItemsWrap.innerHTML = `<p style="color:#94a3b8;">Tu carrito está vacío.</p>`;
        cartTotals.textContent = "PDF: US$0.00 · Físico (libros): US$0.00 + envío único al pagar";
        return;
    }
    let pdfTotal = 0;
    let physTotal = 0;
    const shipUsd = (Number(publicCfg.physicalShippingCents) || 999) / 100;
    cartItemsWrap.innerHTML = cart.map((item) => {
        if (item.format === "pdf") pdfTotal += Number(item.price_usd || 0);
        if (item.format === "physical") physTotal += Number(item.price_usd || 0);
        return `
            <div class="cart-item">
                <strong>${item.title}</strong>
                <div class="cart-meta">${item.format === "pdf" ? "PDF digital" : "Libro físico"} · US$${Number(item.price_usd).toFixed(2)}</div>
                <button class="btn-ghost" data-remove="${item.book_id}|${item.format}" style="margin-top:8px;">Quitar</button>
            </div>
        `;
    }).join("");
    cartTotals.textContent =
        `PDF: US$${pdfTotal.toFixed(2)} · Físico (libros): US$${physTotal.toFixed(2)} + envío US$${shipUsd.toFixed(2)} (un solo cargo al pagar con Stripe)`;
    cartItemsWrap.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const [bookId, format] = btn.getAttribute("data-remove").split("|");
            removeFromCart(bookId, format);
        });
    });
}

function setPurchaseFormat(format) {
    selectedFormat = format;
    buyPdfOption.classList.toggle("active", format === "pdf");
    buyPhysicalOption.classList.toggle("active", format === "physical");
    purchaseHint.textContent = format === "pdf"
        ? "PDF: acceso inmediato en «Mis libros» tras pagar con Stripe (requiere cuenta)."
        : "Físico: pago real con Stripe; en el checkout indicas dirección de envío. Un cargo de envío por pedido completo.";
}

function openPurchaseModal(book) {
    selectedBookForPurchase = book;
    purchaseBookTitle.textContent = `${book.title} — US$${getPriceUSD(book).toFixed(2)}`;
    setPurchaseFormat("pdf");
    purchaseModal.style.display = "flex";
}

function closePurchaseModal() {
    purchaseModal.style.display = "none";
    selectedBookForPurchase = null;
}

function renderGrid(books, isLibrary = false, emptyMsg = null) {
    bookGrid.innerHTML = "";
    if (books.length === 0) {
        bookGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 100px; color: var(--text-grey); font-family: 'Lora', serif; font-style: italic;">${emptyMsg || "No se encontraron obras en esta colección por ahora."}</p>`;
        return;
    }

    books.forEach(book => {
        const card = document.createElement("div");
        card.className = "m-card";
        
        // Imagen por defecto si no hay cover
        const coverSrc = book.cover_url || "https://images.unsplash.com/photo-1543005141-850f38006e10?q=80&w=400&auto=format&fit=crop";
        
        card.innerHTML = `
            <div class="m-cover-container">
                <img src="${coverSrc}" class="m-cover" alt="${book.title}">
            </div>
            <div class="m-card-body">
                <div class="m-card-title">${book.title}</div>
                <div class="m-card-author">Por ${book.author_name || book.author_email || "Autor desconocido"}</div>
                
                <div class="m-card-footer">
                    <div class="m-price">
                        ${getPriceUSD(book) > 0 ? "<span>US$</span>" + getPriceUSD(book).toFixed(2) : "Cortesía"}
                    </div>
                    <div style="color: var(--accent-ocre); font-size: 0.8rem; font-weight: 700;">
                        ${book.avg_rating ? '<i class="fa-solid fa-star"></i> ' + Number(book.avg_rating).toFixed(1) : "NUEVA OBRA"}
                    </div>
                </div>
                
                <div class="m-card-actions">
                    <button class="btn-buy-mini" data-details="1">Ver Detalles</button>
                    ${isLibrary
                        ? `<button class="btn-cart-mini" data-read="1">Leer</button>`
                        : `<button class="btn-cart-mini" data-cart="1">Comprar</button>`}
                </div>
            </div>
        `;

        card.querySelector("[data-details]")?.addEventListener("click", (e) => {
            e.stopPropagation();
            window.location.href = `/libroia/marketplace-detail.html?slug=${book.slug}`;
        });
        card.querySelector("[data-read]")?.addEventListener("click", (e) => {
            e.stopPropagation();
            window.location.href = `/libroia/reader.html?book_id=${book.id}`;
        });
        card.querySelector("[data-cart]")?.addEventListener("click", (e) => {
            e.stopPropagation();
            if (getPriceUSD(book) <= 0) {
                window.location.href = `/libroia/reader.html?book_id=${book.id}`;
                return;
            }
            openPurchaseModal(book);
        });
        
        bookGrid.appendChild(card);
    });
}

async function checkSession() {
    try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        currentUser = data.user || null;
    } catch {
        currentUser = null;
    }
}

async function loadPublicCfg() {
    try {
        const res = await fetch("/api/config/public");
        if (!res.ok) return;
        const j = await res.json();
        if (j && typeof j.physicalShippingCents === "number") {
            publicCfg.physicalShippingCents = j.physicalShippingCents;
        }
    } catch {
        /* defaults */
    }
}

tabMarket.onclick = () => {
    tabMarket.classList.add("active");
    tabLibrary.classList.remove("active");
    loadMarketplace();
};

tabLibrary.onclick = () => {
    tabLibrary.classList.add("active");
    tabMarket.classList.remove("active");
    loadLibrary();
};

buyPdfOption?.addEventListener("click", () => setPurchaseFormat("pdf"));
buyPhysicalOption?.addEventListener("click", () => setPurchaseFormat("physical"));
closePurchaseModalBtn?.addEventListener("click", closePurchaseModal);
purchaseModal?.addEventListener("click", (e) => {
    if (e.target === purchaseModal) closePurchaseModal();
});

addToCartConfirmBtn?.addEventListener("click", () => {
    if (!selectedBookForPurchase) return;
    addToCart({
        book_id: selectedBookForPurchase.id,
        slug: selectedBookForPurchase.slug,
        title: selectedBookForPurchase.title,
        format: selectedFormat,
        price_usd: getPriceUSD(selectedBookForPurchase),
    });
    closePurchaseModal();
    cartDrawer.classList.add("open");
});

openCartBtn?.addEventListener("click", () => cartDrawer.classList.add("open"));
closeCartBtn?.addEventListener("click", () => cartDrawer.classList.remove("open"));

checkoutPdfBtn?.addEventListener("click", async () => {
    const cart = getCart();
    const pdfItems = cart.filter((i) => i.format === "pdf");
    if (!pdfItems.length) {
        alert("No hay libros PDF en el carrito.");
        return;
    }
    if (!currentUser) {
        alert("Debes iniciar sesión para comprar PDF. Te llevamos al inicio.");
        window.location.href = "/";
        return;
    }
    try {
        const res = await fetch("/api/payments/create-cart-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ book_ids: pdfItems.map((i) => i.book_id) }),
        });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
            return;
        }
        throw new Error(data.error || "No se pudo iniciar el checkout.");
    } catch (err) {
        alert(err.message || "Error de checkout.");
    }
});

checkoutPhysicalBtn?.addEventListener("click", async () => {
    const physicalItems = getCart().filter((i) => i.format === "physical");
    if (!physicalItems.length) {
        alert("No hay libros físicos en el carrito.");
        return;
    }
    if (!currentUser) {
        alert("Debes iniciar sesión para el pedido físico. Te llevamos al inicio.");
        window.location.href = "/";
        return;
    }
    try {
        const res = await fetch("/api/payments/create-physical-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ book_ids: physicalItems.map((i) => i.book_id) }),
        });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
            return;
        }
        throw new Error(data.error || "No se pudo iniciar el checkout físico.");
    } catch (err) {
        alert(err.message || "Error de checkout.");
    }
});

// Carga inicial
Promise.all([checkSession(), loadPublicCfg()]).then(() => {
    renderCart();
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "library") {
        currentView = "library";
        tabLibrary.classList.add("active");
        tabMarket.classList.remove("active");
        loadLibrary();
    } else {
        loadMarketplace();
    }
});
