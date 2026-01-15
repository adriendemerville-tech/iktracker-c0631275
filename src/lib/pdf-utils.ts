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

  // CORRECTION 1 : Z-Index sûrs (inférieurs à 2147483647)
  const overlay = document.createElement('div');
  overlay.setAttribute('data-pdf-overlay', 'true');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'white'; // Opaque pour cacher le site derrière
  overlay.style.zIndex = '9998'; // Juste en dessous du container
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

  // Rendu plus "agressif" : iframe temporaire hors-écran (mais visible) pour forcer le calcul des styles
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-pdf-iframe', 'true');
  Object.assign(iframe.style, {
    position: 'absolute',
    left: '-10000px',
    top: '0',
    width: '1122px',
    height: '794px',
    border: '0',
    background: 'white',
    opacity: '1',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);

  document.body.appendChild(overlay);
  document.body.appendChild(iframe);

  // Scroll en haut (au cas où)
  window.scrollTo(0, 0);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  try {
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Impossible de créer le document iframe pour le PDF');
    }

    // Construire une page complète dans l'iframe
    iframeDoc.open();
    iframeDoc.write('<!doctype html><html><head></head><body></body></html>');
    iframeDoc.close();

    // Injecter les styles actuels (Tailwind + CSS global) dans l'iframe
    const currentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.cloneNode(true));
    currentStyles.forEach((node) => iframeDoc.head.appendChild(node));

    // Parser le HTML reçu (permet de récupérer body proprement)
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    // Injecter aussi les <style> contenus dans le HTML du rapport
    const rawStyles = Array.from(parsed.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n');
    if (rawStyles.trim()) {
      const styleEl = iframeDoc.createElement('style');
      styleEl.textContent = rawStyles;
      iframeDoc.head.appendChild(styleEl);
    }

    const bodyHtml = (parsed.body?.innerHTML || '').trim();
    if (!bodyHtml) {
      throw new Error('Relevé HTML vide');
    }

    // Container de rendu dans l'iframe (équivalent au bloc demandé)
    const container = iframeDoc.createElement('div');
    container.id = 'pdf-render-temp';
    Object.assign(container.style, {
      width: '1122px',
      background: 'white',
      color: 'black',
    } as CSSStyleDeclaration);
    container.innerHTML = bodyHtml;
    iframeDoc.body.appendChild(container);

    // Forcer le re-calcul des styles
    try {
      (iframe.contentWindow || window).getComputedStyle(container).opacity;
    } catch {
      // ignore
    }

    // Laisser le temps au layout / Tailwind / polices / images de se stabiliser
    await nextFrame();
    await nextFrame();

    // Délai augmenté (1500ms)
    await wait(1500);

    // Wait for fonts (best-effort)
    try {
      await (iframeDoc as any).fonts?.ready;
    } catch {
      // ignore
    }

    // Wait for images
    const images = Array.from(container.querySelectorAll('img'));
    const waitImages = Promise.all(
      images.map((img) => {
        if ((img as HTMLImageElement).complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      })
    );
    await Promise.race([waitImages, wait(4000)]);

    const worker = html2pdf()
      .set({
        margin: 10,
        filename: 'releve-ik.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          letterRendering: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1122,
          windowHeight: 794,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape',
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(container)
      .toPdf();

    const pdfBlob = await worker.get('pdf').then((pdf: any) => pdf.output('blob'));

    if (!pdfBlob || pdfBlob.size < 1500) {
      throw new Error('PDF vide (capture blanche)');
    }

    return pdfBlob;
  } finally {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    if (document.body.contains(overlay)) document.body.removeChild(overlay);

    // Restaurer le scroll utilisateur
    window.scrollTo(originalScrollX, originalScrollY);
  }
}

