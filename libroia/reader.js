const readerBody = document.getElementById("readerBody");
const bookMainTitle = document.getElementById("bookMainTitle");
const bookChapters = document.getElementById("bookChapters");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const bookTitleNav = document.getElementById("bookTitleNav");

const urlParams = new URLSearchParams(window.location.search);
const bookId = urlParams.get("id");

const isSample = urlParams.get("sample") === "true";

async function loadBook() {
    if (!bookId) {
        bookMainTitle.textContent = "ID de libro no proporcionado";
        return;
    }

    try {
        const r2 = await fetch(`/api/marketplace/reader/${bookId}`);
        const book = await r2.json();
        
        if (book.error) throw new Error(book.error);

        document.title = (isSample ? "[Muestra] " : "") + `${book.title} | Lector LibroAI`;
        bookMainTitle.textContent = book.title;
        bookTitleNav.textContent = book.title;

        // Determinar URL de contenido (Muestra o Completo)
        const contentUrl = isSample ? book.sample_url : book.pdf_url;

        if (contentUrl) {
            const contentRes = await fetch(contentUrl);
            const markdown = await contentRes.text();
            
            // Sanitización básica para XSS
            const cleanMarkdown = markdown.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            bookChapters.innerHTML = marked.parse(cleanMarkdown);
            
            // Registrar evento inicial
            fetch(`/api/marketplace/book/${bookId}/event`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_type: isSample ? "sample_read" : "full_read_start" })
            });
        } else {
            bookChapters.innerHTML = `<p>El contenido no está disponible.</p>`;
        }

        if (book.progress && !isSample) {
            setTimeout(() => {
                const scrollPos = (document.documentElement.scrollHeight - window.innerHeight) * (book.progress / 100);
                window.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }, 500);
        }

    } catch (err) {
        console.error(err);
        bookMainTitle.textContent = "Error al cargar el libro";
    }
}

// Debounce para no saturar la DB
let debounceTimer;
window.onscroll = () => {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (height <= 0) return;
    
    const scrolled = (winScroll / height) * 100;
    
    progressBar.style.width = scrolled + "%";
    progressText.textContent = Math.round(scrolled) + "% leído";
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        saveProgress(scrolled);
        
        // Registrar lectura completa si llega al final
        if (scrolled > 95) {
            fetch(`/api/marketplace/book/${bookId}/event`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_type: "full_read" })
            });
        }
    }, 1000); // Guardar después de 1 segundo de inactividad de scroll
};

let lastSavedProgress = 0;
async function saveProgress(prog) {
    if (Math.abs(prog - lastSavedProgress) < 2) return;
    lastSavedProgress = prog;
    
    try {
        await fetch(`/api/marketplace/book/${bookId}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ progress: prog })
        });
    } catch (err) {
        console.error("Error saving progress:", err);
    }
}

loadBook();
