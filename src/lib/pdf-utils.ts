// Dynamic utilities - loaded on demand to reduce initial bundle size
// PDF generation uses html2pdf.js for better quality

let zipPromise: Promise<any> | null = null;
let html2pdfPromise: Promise<any> | null = null;

// Legacy exports - kept for backward compatibility during transition
// These now throw errors to catch any remaining usage
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

  // 1. Sauvegarder la position de scroll actuelle pour ne pas désorienter l'utilisateur
  const originalScrollY = window.scrollY;
  const originalScrollX = window.scrollX;

  const parsed = new DOMParser().parseFromString(html, 'text/html');

  // CORRECTION 1 : Récupérer TOUS les styles (y compris externes <link>)
  // On clone les nœuds de style du document actuel pour être sûr d'avoir Tailwind/CSS
  const currentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.cloneNode(true));

  // On récupère aussi les styles inlines du HTML fourni
  const rawStyles = Array.from(parsed.querySelectorAll('style'))
    .map((s) => s.textContent || '')
    .join('\n');

  // Note : Le scoping (.replace...) est risqué et peut casser des classes comme "body-text". 
  // Je le garde car c'est ta logique, mais c'est une source potentielle de bugs d'affichage.
  const scopedStyles = rawStyles
    .replace(/(^|[,{\s])html(?=\b)/g, '$1.pdf-root')
    .replace(/(^|[,{\s])body(?=\b)/g, '$1.pdf-root')
    .replace(/(^|[,{\s]):root(?=\b)/g, '$1.pdf-root');

  // Overlay : On le garde pour l'UX, mais on va s'assurer qu'il ne bloque pas le rendu
  const overlay = document.createElement('div');
  overlay.setAttribute('data-pdf-overlay', 'true');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(255, 255, 255, 0.98)';
  overlay.style.zIndex = '2147483647'; // Très haut
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  overlay.style.fontSize = '14px';
  overlay.style.color = '#0f172a';
  overlay.textContent = 'Génération du PDF…';

  const container = document.createElement('div');
  container.className = 'pdf-root';

  // CORRECTION 2 : Absolute + Top 0 + Z-Index Supérieur
  // On utilise absolute pour éviter les bugs de 'fixed' dans html2canvas
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '1122px'; // A4 landscape @ 96dpi
  container.style.minHeight = '794px'; // Force une hauteur min
  container.style.background = 'white';
  // CORRECTION 3 : Le container doit être AU-DESSUS de l'overlay pour être "paint" par le navigateur
  container.style.zIndex = '2147483648';
  container.style.opacity = '1';
  container.style.overflow = 'visible';

  // Injection des styles du document actuel (Tailwind, etc.)
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

  document.body.appendChild(overlay);
  document.body.appendChild(container);

  // CORRECTION 4 : Scroll forcé en haut (0,0) pour aligner le canvas
  window.scrollTo(0, 0);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  await nextFrame();
  await nextFrame();

  // Attendre un peu plus longtemps pour le layout
  await wait(500);

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
          logging: true, // Active les logs pour débugger si besoin
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



