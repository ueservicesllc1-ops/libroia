
const e = React.createElement;

function PremiumReader({ book, onClose }) {
  const containerRef = React.useRef(null);
  const flipRef = React.useRef(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [paginatedPages, setPaginatedPages] = React.useState([]);

  const chapters = book.chapters || [];

  // MOTOR DE MAQUETACIÓN EDITORIAL PROFESIONAL
  React.useEffect(() => {
    const tempDiv = document.createElement('div');
    // Dimensiones de caja de texto estándar (550px ancho - margenes)
    tempDiv.style.width = '390px'; 
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.position = 'absolute';
    tempDiv.style.fontSize = '15px';
    tempDiv.style.lineHeight = '1.6';
    tempDiv.style.fontFamily = "'Lora', serif";
    tempDiv.style.textAlign = 'justify';
    document.body.appendChild(tempDiv);

    const maxHeight = 580; // Altura máxima útil por página
    const allPages = [];

    // 1. PORTADA
    allPages.push({ type: 'cover', title: book.title, author: book.authorName, image: book.coverImageUrl });

    // 2. PROCESO DE MAQUETACIÓN PALABRA POR PALABRA
    chapters.forEach((ch) => {
      let currentHTML = `<h3>${ch.title}</h3>`;
      const words = (ch.content || '').split(/\s+/);
      
      let pageBuffer = currentHTML;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testHTML = pageBuffer + ' ' + word;
        tempDiv.innerHTML = testHTML;

        if (tempDiv.offsetHeight > maxHeight) {
          // Si no cabe, guardamos la página actual y empezamos una nueva
          allPages.push({ type: 'content', content: pageBuffer });
          pageBuffer = `<p>${word}`;
        } else {
          pageBuffer += (i === 0 && !currentHTML ? '' : ' ') + word;
        }
      }
      
      if (pageBuffer) {
        allPages.push({ type: 'content', content: pageBuffer });
      }
    });

    // 3. CONTRAPORTADA
    allPages.push({ type: 'back-cover' });

    setPaginatedPages(allPages);
    document.body.removeChild(tempDiv);
  }, [book]);

  React.useEffect(() => {
    if (!containerRef.current || paginatedPages.length === 0) return;

    const pageFlip = new St.PageFlip(containerRef.current, {
      width: 550,
      height: 750,
      size: 'stretch',
      showCover: true,
      flippingTime: 850,
      maxShadowOpacity: 0.4,
      startPage: 0
    });

    pageFlip.loadFromHTML(document.querySelectorAll(".page-content-block"));
    flipRef.current = pageFlip;
    setTotalPages(pageFlip.getPageCount());
    pageFlip.on('flip', (e) => setCurrentPage(e.data));

    return () => {
      if (flipRef.current) flipRef.current.destroy();
    };
  }, [paginatedPages]);

  if (paginatedPages.length === 0) {
    return e('div', { className: 'fixed inset-0 bg-black flex items-center justify-center text-white font-serif' }, 'Componiendo edición editorial...');
  }

  return e('div', { 
    className: 'fixed inset-0 bg-[#0c0c0e] flex flex-col items-center justify-center z-[10000] overflow-hidden' 
  }, [
    // Header Minimalista
    e('header', { className: 'absolute top-0 left-0 right-0 h-16 px-10 flex items-center justify-between z-50 text-white/20' }, [
      e('button', { onClick: onClose, className: 'hover:text-white transition-colors text-[10px] font-bold tracking-[0.2em]' }, 'SALIR'),
      e('div', { className: 'text-[9px] uppercase tracking-[0.5em]' }, book.title)
    ]),

    // Escena del Libro
    e('div', { className: 'relative z-10 w-full max-w-5xl flex items-center justify-center' }, [
      e('div', { ref: containerRef, className: 'shadow-[0_60px_120px_rgba(0,0,0,0.9)]' }, 
        paginatedPages.map((page, idx) => {
          if (page.type === 'cover') {
            return e('div', { key: idx, className: 'page-content-block bg-[#1a1a1c] flex flex-col items-center justify-center text-center p-14 border-l-[12px] border-black/30' }, [
              page.image && e('img', { src: page.image, className: 'absolute inset-0 w-full h-full object-cover opacity-20' }),
              e('div', { className: 'relative z-10' }, [
                e('h1', { className: 'text-4xl font-serif text-[#c5a059] mb-8 leading-tight' }, page.title),
                e('div', { className: 'w-12 h-px bg-[#c5a059]/40 mx-auto mb-8' }),
                e('p', { className: 'text-[#c5a059]/80 tracking-[0.4em] uppercase text-[9px] font-bold' }, page.author)
              ])
            ]);
          }
          if (page.type === 'back-cover') {
            return e('div', { key: idx, className: 'page-content-block bg-[#1a1a1c] border-r-[12px] border-black/30' });
          }
          return e('div', { key: idx, className: 'page-content-block bg-[#fdfaf6] p-[60px_70px_80px_80px]' }, [
            e('div', { 
              className: 'prose prose-slate max-w-none text-justify font-serif h-full editorial-text',
              style: { 
                fontSize: '15px', 
                lineHeight: '1.6', 
                color: '#2a2a2a',
                hyphens: 'auto'
              },
              dangerouslySetInnerHTML: { __html: page.content }
            }),
            e('div', { className: 'absolute bottom-10 left-0 right-0 text-center text-[10px] text-black/20 font-serif' }, idx)
          ]);
        })
      )
    ]),

    // Indicador de Progreso Inmersivo
    e('div', { className: 'absolute bottom-10 flex items-center gap-10 z-50' }, [
      e('button', { onClick: () => flipRef.current?.flipPrev(), className: 'text-white/10 hover:text-white transition-all' }, [
        e('i', { className: 'fa-solid fa-arrow-left-long' })
      ]),
      e('div', { className: 'flex flex-col items-center gap-2' }, [
        e('div', { className: 'w-48 h-px bg-white/5 relative' }, [
          e('div', { 
            className: 'absolute left-0 top-0 h-full bg-[#c5a059] transition-all duration-500',
            style: { width: `${((currentPage + 1) / totalPages) * 100}%` }
          })
        ]),
        e('span', { className: 'text-[9px] text-white/20 tracking-widest' }, `${currentPage + 1} / ${totalPages}`)
      ]),
      e('button', { onClick: () => flipRef.current?.flipNext(), className: 'text-white/10 hover:text-white transition-all' }, [
        e('i', { className: 'fa-solid fa-arrow-right-long' })
      ])
    ])
  ]);
}

window.initPremiumReader = function(book) {
  const root = ReactDOM.createRoot(document.getElementById('premium-reader-root'));
  root.render(e(PremiumReader, { 
    book, 
    onClose: () => {
      document.getElementById('realBookOverlay').classList.add('hidden');
      document.body.style.overflow = '';
      root.unmount();
    }
  }));
};
