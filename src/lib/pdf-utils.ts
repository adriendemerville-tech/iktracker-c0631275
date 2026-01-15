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
  const html2pdf = await loadHtml2Pdf();

  // 1. Sauvegarder la position de scroll actuelle
  const originalScrollY = window.scrollY;
  const originalScrollX = window.scrollX;

  const parsed = new DOMParser().parseFromString(html, 'text/html');

  // Récupérer les styles
  const currentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.cloneNode(true));

  const rawStyles = Array.from(parsed.querySelectorAll('style'))
    .map((s) => s.textContent || '')
    .join('\n');

  const scopedStyles = rawStyles
    .replace(/(^|[,{\s])html(?=\b)/g, '$1.pdf-root')
    .replace(/(^|[,{\s])body(?=\b)/g, '$1.pdf-root')
    .replace(/(^|[,{\s]):root(?=\b)/g, '$1.pdf-root');

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

  const container = document.createElement('div');
  container.className = 'pdf-root';

  // CORRECTION 2 : Position Fixed + Top Left 0
  // "Fixed" garantit que le container est collé à l'écran, peu importe le scroll
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '1122px'; // Largeur A4 Paysage
  container.style.zIndex = '9999'; // AU-DESSUS de l'overlay pour être "vu" par la caméra

  // CORRECTION 3 : Styles forcés pour éviter la transparence
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.visibility = 'visible'; // Force la visibilité

  // Injection des styles
  currentStyles.forEach(node => container.appendChild(node));

  if (scopedStyles.trim()) {
    const styleEl = document.createElement('style');
    styleEl.textContent = scopedStyles;
    container.appendChild(styleEl);
  }

  const bodyHtml = (parsed.body?.innerHTML || '').trim();
  if (!bodyHtml) {
    throw new Error('Relevé HTML vide');
  }

  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = bodyHtml;
  container.appendChild(bodyEl);

  // Montage dans le DOM
  document.body.appendChild(overlay);
  document.body.appendChild(container);

  // Scroll en haut (au cas où)
  window.scrollTo(0, 0);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  await nextFrame();
  await nextFrame();

  // Attendre un peu pour le layout
  await wait(300);

  // Wait for fonts (best-effort)
  try {
    await (document as any).fonts?.ready;
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
  await Promise.race([waitImages, wait(3000)]);

  try {
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
    if (document.body.contains(container)) document.body.removeChild(container);
    if (document.body.contains(overlay)) document.body.removeChild(overlay);

    // Restaurer le scroll utilisateur
    window.scrollTo(originalScrollX, originalScrollY);
  }
}
