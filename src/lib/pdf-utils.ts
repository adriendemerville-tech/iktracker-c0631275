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

  // Render into the current document (same window) to avoid html2canvas blank captures.
  // We scope global selectors (html/body/:root) to a dedicated container.
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  const rawStyles = Array.from(parsed.querySelectorAll('style'))
    .map((s) => s.textContent || '')
    .join('\n');

  const scopedStyles = rawStyles
    // scope html/body/root rules to our container
    .replace(/(^|[,{\s])html(?=\b)/g, '$1.pdf-root')
    .replace(/(^|[,{\s])body(?=\b)/g, '$1.pdf-root')
    .replace(/(^|[,{\s]):root(?=\b)/g, '$1.pdf-root');

  // Overlay to prevent the user from seeing the rendered report while we capture it.
  // NOTE: the overlay is NOT part of the captured element (we capture `container` only).
  const overlay = document.createElement('div');
  overlay.setAttribute('data-pdf-overlay', 'true');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(255, 255, 255, 0.98)';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  overlay.style.fontSize = '14px';
  overlay.style.color = '#0f172a';
  overlay.textContent = 'Génération du PDF…';

  const container = document.createElement('div');
  container.className = 'pdf-root';

  // Keep it rendered in the viewport (important for mobile Chrome html2canvas),
  // but block user interaction/visibility with the overlay above.
  // IMPORTANT: avoid display:none/visibility:hidden -> can lead to a blank canvas.
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '1122px'; // A4 landscape @ 96dpi
  container.style.minHeight = '794px';
  container.style.background = 'white';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '2147483646';
  container.style.opacity = '1';
  container.style.overflow = 'visible';


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

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Give the browser time to layout + apply styles
  await nextFrame();
  await nextFrame();
  await wait(200);

  // Wait for fonts (best-effort)
  try {
    await (document as any).fonts?.ready;
  } catch {
    // ignore
  }

  // Wait for images (best-effort, with timeout)
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
  await Promise.race([waitImages, wait(2000)]);

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

    // Basic sanity check: an almost-empty PDF is usually a blank capture
    if (!pdfBlob || pdfBlob.size < 1500) {
      throw new Error('PDF vide (capture blanche)');
    }

    return pdfBlob;
  } finally {
    if (document.body.contains(container)) document.body.removeChild(container);
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
  }
}



