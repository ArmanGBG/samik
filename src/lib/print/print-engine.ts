/**
 * print-engine.ts
 *
 * Safe, cross-browser, iframe-based print engine for official school documents.
 * Ensures no popup blockers trigger and cleans up automatically after printing.
 */

export function triggerPrintHtml(html: string, documentTitle: string = "سند رسمی سامیک"): void {
  if (typeof window === "undefined") return;

  // Use a hidden iframe so browsers do not block popups and context is isolated.
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.title = documentTitle;

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    // Fallback to window.open if iframe document not accessible
    const win = window.open("", "_blank", "width=1000,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.setTimeout(() => {
        win.focus();
        win.print();
      }, 250);
    }
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const handlePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("[PRINT_ERROR]", e);
    } finally {
      // Clean up iframe after printing dialog closes or a timeout
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  };

  // Wait for all fonts and images/styles to be loaded in the iframe
  if (iframe.contentWindow) {
    if (doc.readyState === "complete") {
      setTimeout(handlePrint, 250);
    } else {
      iframe.contentWindow.onload = () => setTimeout(handlePrint, 250);
    }
  } else {
    setTimeout(handlePrint, 300);
  }
}
