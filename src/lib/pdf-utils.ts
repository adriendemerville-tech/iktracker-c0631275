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

  const container = document.createElement('div');
  container.className = 'pdf-root';

  // IMPORTANT
  // - Do NOT use opacity < 1: html2canvas captures it, resulting in a "blank" looking PDF.
  // - Keep it off-screen (not display:none/visibility:hidden) so it still renders.
  const minWidth = 1122; // A4 landscape @ 96dpi (approx)
  const minHeight = 794;

  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${Math.max(window.innerWidth, minWidth)}px`;
  container.style.minHeight = `${Math.max(window.innerHeight, minHeight)}px`;
  container.style.background = '#ffffff';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-1';
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
    // Remove preview-only UI from the capture
    container.querySelector('.action-buttons')?.remove();

    // Each .page becomes one PDF page (1 canvas screenshot per HTML page)
    const pageEls = Array.from(container.querySelectorAll<HTMLElement>('.page'));

    // If there is a footer outside the last .page, attach it to the last capture.
    const footerEl = container.querySelector<HTMLElement>('.footer');

    const targets: HTMLElement[] = pageEls.length ? [...pageEls] : [container];
    if (pageEls.length && footerEl) {
      const lastPage = pageEls[pageEls.length - 1];
      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper';
      wrapper.appendChild(lastPage.cloneNode(true));
      wrapper.appendChild(footerEl.cloneNode(true));
      targets[targets.length - 1] = wrapper;
    }

    // Create a jsPDF instance via html2pdf (we'll draw canvases ourselves to ensure 1:1 pages)
    const base = await html2pdf()
      .set({
        margin: 0,
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
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape',
        },
      })
      .from(targets[0])
      .toPdf();

    const pdf = await base.get('pdf');

    // Ensure we keep exactly the same number of PDF pages as HTML pages
    while (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];

      // If we created a wrapper for the last page, it is not in the DOM; temporarily mount it
      let mountedWrapper: HTMLElement | null = null;
      if (!target.isConnected) {
        mountedWrapper = target;
        container.appendChild(mountedWrapper);
      }

      try {
        const w = Math.max(target.scrollWidth, minWidth);
        const h = Math.max(target.scrollHeight, minHeight);

        const canvasWorker = await html2pdf()
          .set({
            margin: 0,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              letterRendering: true,
              logging: false,
              scrollX: 0,
              scrollY: 0,
              windowWidth: w,
              windowHeight: h,
              width: w,
              height: h,
            },
            jsPDF: {
              unit: 'mm',
              format: 'a4',
              orientation: 'landscape',
            },
          })
          .from(target)
          .toCanvas();

        const canvas = await canvasWorker.get('canvas');
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (i > 0) {
          pdf.addPage();
        }

        pdf.setPage(i + 1);
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        // Fill the full page to avoid clipped/partial captures
        pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
      } finally {
        if (mountedWrapper) {
          container.removeChild(mountedWrapper);
        }
      }
    }

    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }

}



