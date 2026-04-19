/**
 * Compresses a PDF file using pdf-lib by stripping metadata and flattening forms.
 * Assumes pdf-lib is loaded globally via popup.html.
 */
export async function compressPDF(file) {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Read the file into an ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // 2. Load the PDFDocument using PDFLib (global object from pdf-lib.min.js)
            const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
            
            // --- OPTIMIZATION 1: STRIP METADATA ---
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('');
            pdfDoc.setCreator('');

            // --- OPTIMIZATION 2: FLATTEN FORMS ---
            // AcroForms add structural overhead, especially in form-heavy PDFs.
            // Flattening bakes fields directly into the page canvas.
            const form = pdfDoc.getForm();
            try {
                form.flatten();
            } catch (e) {
                // If there's an error flattening (e.g. no fonts), just ignore to avoid breaking the main process
                console.warn("Could not flatten PDF forms", e);
            }

            // 3. Serialize the optimized PDFDocument to bytes
            const pdfBytes = await pdfDoc.save();

            // 4. Create the final compressed blob
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            // 5. Calculate metrics
            const originalBytes = file.size;
            const compressedBytes = blob.size;
            const ratio = (compressedBytes > 0) ? (originalBytes / compressedBytes).toFixed(2) : "0.00";
            const savings = (originalBytes > 0) ? (((originalBytes - compressedBytes) / originalBytes) * 100).toFixed(1) : "0.0";

            resolve({
                blob: blob,
                metrics: {
                    originalSize: formatBytes(originalBytes),
                    compressedSize: formatBytes(compressedBytes),
                    ratio: `${ratio}:1`,
                    savings: savings
                }
            });

        } catch (error) {
            console.error("PDF compression error:", error);
            reject(new Error("Failed to optimize PDF."));
        }
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
