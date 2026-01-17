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
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'white';
  overlay.style.zIndex = '9998';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontFamily = 'system-ui, sans-serif';
  overlay.innerHTML = `
    <div style="text-align:center">
      <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
      <div style="font-size: 14px; color: #333;">Génération du PDF...</div>
    </div>
  `;

  // IMPORTANT:
  // On ne rend PLUS le HTML dans une iframe.
  // html2pdf/html2canvas gère très mal les noeuds issus d'un autre document (styles perdus / rendu texte brut).
  // On rend donc le HTML dans le document courant, hors-écran, puis on capture ce noeud.
  const renderRoot = document.createElement('div');
  renderRoot.setAttribute('data-pdf-root', 'true');
  Object.assign(renderRoot.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1122px',
    background: 'white',
    color: 'black',
    opacity: '1',
    pointerEvents: 'none',
    zIndex: '0',
  } as CSSStyleDeclaration);

  document.body.appendChild(overlay);
  document.body.appendChild(renderRoot);

  // Scroll en haut (au cas où)
  window.scrollTo(0, 0);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Styles/links temporaires ajoutés dans le head (pour les retirer ensuite)
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

    // Injecter aussi les éventuels <link rel="stylesheet"> du HTML (best-effort)
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

    // Forcer un recalcul du layout
    renderRoot.getBoundingClientRect();

    // Laisser le temps au CSS / layout / images de se stabiliser
    await nextFrame();
    await nextFrame();

    // Attendre les stylesheets externes (best-effort)
    await Promise.race([Promise.all(linkLoads), wait(2000)]);

    // Petit délai supplémentaire
    await wait(250);

    // Wait for fonts (best-effort)
    try {
      await (document as any).fonts?.ready;
    } catch {
      // ignore
    }

    // Wait for images inside renderRoot
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

    const windowHeight = Math.max(794, Math.min(6000, renderRoot.scrollHeight || 794));

    const worker = html2pdf()
      .set({
        margin: 10,
        filename: 'releve-ik.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1122,
          windowHeight,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape',
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(renderRoot)
      .toPdf();

    const pdfBlob = await worker.get('pdf').then((pdf: any) => pdf.output('blob'));

    if (!pdfBlob || pdfBlob.size < 1500) {
      throw new Error('PDF vide (capture blanche)');
    }

    return pdfBlob;
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

