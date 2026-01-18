// Dynamic utilities - loaded on demand to reduce initial bundle size
// PDF generation uses html2pdf.js for better quality

let zipPromise: Promise<any> | null = null;
let html2pdfPromise: Promise<any> | null = null;

// Legacy exports - kept for backward compatibility during transition
export function preloadPDFLibraries() {
  console.warn('PDF libraries have been removed. Use printReport from print-utils.ts instead.');
  return Promise.resolve({ jsPDF: null, autoTable: null });
}

export async function loadPDFLibraries() {
  console.warn('PDF libraries have been removed. Use printReport from print-utils.ts instead.');
  return { jsPDF: null, autoTable: null };
}

// Preload ZIP library
export function preloadZip() {
  if (!zipPromise) {
    zipPromise = import('jszip').then(m => m.default);
  }
  return zipPromise;
}

export async function loadZip() {
  return preloadZip();
}

// Load html2pdf library for converting HTML to PDF
export async function loadHtml2Pdf() {
  if (!html2pdfPromise) {
    html2pdfPromise = import('html2pdf.js').then(m => m.default);
  }
  return html2pdfPromise;
}

// Convert HTML string to PDF blob
export async function htmlToPdfBlob(html: string): Promise<Blob> {
  console.log("Contenu HTML reçu pour le PDF:", (html || "").substring(0, 500));

  if (!html || html.trim().length < 100) {
    console.error("Erreur: Le HTML envoyé au PDF est vide ou trop court.");
    throw new Error("Contenu du rapport invalide");
  }

  const html2pdf = await loadHtml2Pdf();

  // 1. Sauvegarder la position de scroll actuelle
  const originalScrollY = window.scrollY;
  const originalScrollX = window.scrollX;

  // Overlay de chargement (pour masquer le site derrière)
  const overlay = document.createElement('div');
  overlay.setAttribute('data-pdf-overlay', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'white',
    zIndex: '99999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  });
  overlay.innerHTML = `
    <div style="text-align:center">
      <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
      <div style="font-size: 14px; color: #333;">Génération du PDF...</div>
    </div>
  `;

  // Container pour le rendu - DOIT être visible et dans le viewport pour html2canvas
  const renderRoot = document.createElement('div');
  renderRoot.setAttribute('data-pdf-root', 'true');
  Object.assign(renderRoot.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    // Largeur adaptée au format A4 paysage
    width: '1122px',
    minHeight: '794px',
    background: '#ffffff',
    color: '#000000',
    zIndex: '99997',
    overflow: 'visible',
    padding: '40px 60px',
    boxSizing: 'border-box',
    // Force visibility for html2canvas
    opacity: '1',
    visibility: 'visible',
  });

  // Scroll en haut AVANT d'ajouter les éléments
  window.scrollTo(0, 0);

  document.body.appendChild(renderRoot);
  document.body.appendChild(overlay); // Overlay AU-DESSUS pour cacher visuellement

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Styles/links temporaires ajoutés dans le head
  const injectedHeadNodes: HTMLElement[] = [];

  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    const bodyHtml = (parsed.body?.innerHTML || '').trim();
    if (!bodyHtml) {
      throw new Error('Relevé HTML vide');
    }

    // Injecter les styles du document HTML (si présents)
    const rawStyles = Array.from(parsed.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n');
    if (rawStyles.trim()) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-pdf-style', 'true');
      styleEl.textContent = rawStyles;
      document.head.appendChild(styleEl);
      injectedHeadNodes.push(styleEl);
    }

    // Injecter les <link rel="stylesheet"> du HTML
    const linkEls = Array.from(parsed.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    const linkLoads = linkEls.map((l) => {
      const href = l.getAttribute('href');
      if (!href) return Promise.resolve();

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-pdf-link', 'true');
      document.head.appendChild(link);
      injectedHeadNodes.push(link as any);

      return new Promise<void>((resolve) => {
        link.addEventListener('load', () => resolve(), { once: true });
        link.addEventListener('error', () => resolve(), { once: true });
      });
    });

    // Monter le HTML dans le root de rendu
    renderRoot.innerHTML = bodyHtml;

    // Appliquer les styles visuels sur les .page
    const pageElements = renderRoot.querySelectorAll('.page');
    pageElements.forEach((page) => {
      const el = page as HTMLElement;
      el.style.padding = '30px 40px';
      el.style.background = '#fff';
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      el.style.marginBottom = '30px';
    });

    // Forcer un reflow pour s'assurer que le contenu est rendu
    renderRoot.offsetHeight;

    // Laisser le temps au CSS / layout de se stabiliser
    await nextFrame();
    await nextFrame();

    // Attendre les stylesheets externes
    await Promise.race([Promise.all(linkLoads), wait(2000)]);

    // Délai supplémentaire pour le rendu complet
    await wait(300);

    // Attendre les fonts
    try {
      await (document as any).fonts?.ready;
    } catch {
      // ignore
    }

    // Attendre les images
    const images = Array.from(renderRoot.querySelectorAll('img')) as HTMLImageElement[];
    const waitImages = Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      })
    );
    await Promise.race([waitImages, wait(4000)]);

    // Calculer la hauteur réelle du contenu
    const contentHeight = Math.max(794, renderRoot.scrollHeight || 794);
    const rect = renderRoot.getBoundingClientRect();
    console.log("PDF render diagnostics:", {
      scrollHeight: renderRoot.scrollHeight,
      contentHeight,
      rect,
      textLength: (renderRoot.innerText || '').length,
    });

    const options = {
      margin: 10,
      filename: 'releve-ik.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1122,
        windowHeight: contentHeight,
        // Force le rendu de l'élément même s'il est partiellement caché
        foreignObjectRendering: false,
        allowTaint: true,
        removeContainer: false,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape' as const,
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    // Masquer l'overlay pendant la capture pour éviter le PDF blanc
    overlay.style.display = 'none';
    
    // Attendre plusieurs frames pour s'assurer que le DOM est stable
    await nextFrame();
    await nextFrame();
    await wait(200);

    try {
      // Utiliser la méthode directe de html2pdf
      const pdfBlob: Blob = await html2pdf()
        .set(options)
        .from(renderRoot)
        .outputPdf('blob');

      console.log("PDF blob size:", pdfBlob?.size);

      if (!pdfBlob || pdfBlob.size < 1500) {
        throw new Error('PDF vide (capture blanche) - taille: ' + (pdfBlob?.size || 0));
      }

      return pdfBlob;
    } finally {
      overlay.style.display = 'flex';
    }
  } finally {
    // Cleanup
    injectedHeadNodes.forEach((n) => {
      try {
        n.remove();
      } catch {
        // ignore
      }
    });

    if (document.body.contains(renderRoot)) document.body.removeChild(renderRoot);
    if (document.body.contains(overlay)) document.body.removeChild(overlay);

    // Restaurer le scroll utilisateur
    window.scrollTo(originalScrollX, originalScrollY);
  }
}

