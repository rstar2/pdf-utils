const fs = require("node:fs/promises");
const { PDFDocument } = require("pdf-lib");

const fontSizeTitle = 30;

/**
 * @param {string[]} pdfs
 * @param {string} filename
 * @param {string} [title]
 * @param {boolean} [log]
 */
module.exports = async function make(pdfs, filename, title, log = false) {
  try {
    const pdfDoc = await PDFDocument.create();

    if (title) {
      const page = doc.addPage();
      page.drawText(title, {
        x: 100,
        y: 100,
        size: fontSizeTitle,
      });
    }

    for (const pdfSrc of pdfs) {
      await addPdf(pdfDoc, pdfSrc, log);
    }

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(filename, pdfBytes);
  } catch (error) {
    // "pdf-lib" don't always throw/reject with Error instances but with plain strings
    // and this breaks the "termost" error handling
    if (error instanceof Error) throw error;
    else throw new Error("" + error);
  }
};

/**
 * @param {PDFDocument} doc
 * @param {string} pdfSrc
 * @param {boolean} log
 */
async function addPdf(doc, pdfSrc, log) {
  const pdfSrcBytes = await fs.readFile(pdfSrc);
  const pdfSrcDoc = await PDFDocument.load(pdfSrcBytes);

  // get all pages
  const copiedPages = await doc.copyPages(
    pdfSrcDoc,
    pdfSrcDoc.getPageIndices()
  );
  copiedPages.forEach((page) => doc.addPage(page));
}
