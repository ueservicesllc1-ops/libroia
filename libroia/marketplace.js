const bookGrid = document.getElementById("bookGrid");
const tabMarket = document.getElementById("tabMarket");
const tabLibrary = document.getElementById("tabLibrary");

let currentView = "market";

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
        const res = await fetch("/api/marketplace/library");
        const books = await res.json();
        renderGrid(books, true);
    } catch (err) {
        console.error(err);
    }
}

function renderGrid(books, isLibrary = false) {
    bookGrid.innerHTML = "";
    if (books.length === 0) {
        bookGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 100px; color: var(--text-grey); font-family: 'Lora', serif; font-style: italic;">No se encontraron obras en esta colección por ahora.</p>`;
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
                        ${book.price > 0 ? "<span>US$</span>" + Number(book.price).toFixed(2) : "Cortesía"}
                    </div>
                    <div style="color: var(--accent-ocre); font-size: 0.8rem; font-weight: 700;">
                        ${book.avg_rating ? '<i class="fa-solid fa-star"></i> ' + Number(book.avg_rating).toFixed(1) : "NUEVA OBRA"}
                    </div>
                </div>
                
                <button class="btn-buy-mini" style="margin-top: 15px; width: 100%;">Ver Detalles</button>
            </div>
        `;
        
        card.onclick = () => {
            window.location.href = `/libroia/marketplace-detail.html?slug=${book.slug}`;
        };
        
        bookGrid.appendChild(card);
    });
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

// Carga inicial
loadMarketplace();
