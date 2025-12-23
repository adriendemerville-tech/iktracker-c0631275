// Dynamic PDF utilities - loaded on demand to reduce initial bundle size

export async function loadPDFLibraries() {
  const [jsPDFModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  
  return {
    jsPDF: jsPDFModule.default,
    autoTable: autoTableModule.default
  };
}

export async function loadZip() {
  const JSZipModule = await import('jszip');
  return JSZipModule.default;
}
