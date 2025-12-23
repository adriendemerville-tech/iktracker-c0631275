// Dynamic PDF utilities - loaded on demand to reduce initial bundle size

let pdfLibrariesPromise: Promise<{ jsPDF: any; autoTable: any }> | null = null;
let zipPromise: Promise<any> | null = null;

// Preload PDF libraries (call on hover for better UX)
export function preloadPDFLibraries() {
  if (!pdfLibrariesPromise) {
    pdfLibrariesPromise = Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then(([jsPDFModule, autoTableModule]) => ({
      jsPDF: jsPDFModule.default,
      autoTable: autoTableModule.default
    }));
  }
  return pdfLibrariesPromise;
}

export async function loadPDFLibraries() {
  return preloadPDFLibraries();
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
