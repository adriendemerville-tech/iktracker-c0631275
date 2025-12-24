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
  
  // Create a temporary container - must be visible for html2canvas to work
  const container = document.createElement('div');
  container.innerHTML = html;
  // Position off-screen but still rendered (not display:none)
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '297mm'; // A4 landscape width
  container.style.minHeight = '210mm'; // A4 landscape height
  container.style.zIndex = '-9999';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.background = 'white';
  document.body.appendChild(container);
  
  // Wait for content to render
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const pdfBlob = await html2pdf()
      .set({
        margin: 10,
        filename: 'releve-ik.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          windowWidth: 1122, // A4 landscape at 96dpi
          windowHeight: 794,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      })
      .from(container)
      .outputPdf('blob');
    
    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}
