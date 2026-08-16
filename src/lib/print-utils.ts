// Print/PDF entry points. HTML generation lives in ./print/*.
import { generateReportHTML } from "./print/report-html";
import type { PrintReportOptions } from "./print/report-shared";

export type { PrintReportOptions, UserInfo } from "./print/report-shared";
export { generateCleanPdfHTML } from "./print/clean-pdf-html";

export function printReport(options: PrintReportOptions): void {
  const html = generateReportHTML(options);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error("Cannot access iframe document");
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 1000);
}

export function generatePrintableHTML(options: PrintReportOptions): string {
  return generateReportHTML(options);
}

export async function exportToPDF(options: PrintReportOptions): Promise<void> {
  const html = generateReportHTML(options);

  const { htmlToPdfBlob } = await import("@/lib/pdf-utils");

  const pdfBlob = await htmlToPdfBlob(html);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `releve-ik-${dateStr}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
