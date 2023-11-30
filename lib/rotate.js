const fs = require("node:fs/promises");
const { PDFDocument, degrees } = require("pdf-lib");

/**
 * @param {string[]} pdfs
 * @param {number} [degrees]
 * @param {boolean} [overwrite]
 * @param {boolean} [log]
 */
module.exports = async function make(
  pdfs,
  degrees = 180,
  overwrite = false,
  log = false
) {
  for (const pdfSrc of pdfs) {
    await rotatePdf(pdfSrc, degrees, overwrite, log);
  }
};

/**
 * @param {string} pdfSrc
 * @param {number} degreeAngle
 * @param {boolean} overwrite
 * @param {boolean} [log]
 */
async function rotatePdf(pdfSrc, degreeAngle, overwrite, log) {
  const pdfSrcBytes = await fs.readFile(pdfSrc);
  const pdfSrcDoc = await PDFDocument.load(pdfSrcBytes);

  // get all pages
  const pages = await pdfSrcDoc.getPages();
  pages.forEach((page) => page.setRotation(degrees(degreeAngle)));

  const pdfBytes = await pdfSrcDoc.save();
  await fs.writeFile(
    overwrite ? pdfSrc : pdfSrc.replace(".pdf", "-rotated.pdf"),
    pdfBytes
  );
}
