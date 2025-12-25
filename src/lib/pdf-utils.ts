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

  // html2canvas/html2pdf are much more reliable when we render the *body content*
  // with the embedded <style> rules applied in the same document.
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const combinedStyles = Array.from(parsed.querySelectorAll('style'))
    .map((s) => s.textContent || '')
    .join('\n');

  const container = document.createElement('div');

  // Keep it rendered (so html2canvas can capture it) but not visible to the user.
  // Using opacity:0 makes the capture transparent -> blank PDF.
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.transform = 'translateX(-200vw)';
  container.style.width = '1122px'; // A4 landscape @ 96dpi
  container.style.minHeight = '794px';
  container.style.background = 'white';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';

  if (combinedStyles.trim()) {
    const styleEl = document.createElement('style');
    styleEl.textContent = combinedStyles;
    container.appendChild(styleEl);
  }

  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = parsed.body.innerHTML;
  container.appendChild(bodyEl);

  document.body.appendChild(container);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Give the browser a tick to layout
  await wait(50);

  // Wait for fonts (best-effort)
  try {
    await (document as any).fonts?.ready;
  } catch {
    // ignore
  }


  // Wait for images inside the container (best-effort, with a timeout)
  const images = Array.from(container.querySelectorAll('img'));
  const waitImages = Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    })
  );
  await Promise.race([waitImages, wait(1500)]);

  try {
    const pdfBlob = await html2pdf()
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
      .outputPdf('blob');

    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}

