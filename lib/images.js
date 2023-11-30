const fs = require("node:fs/promises");
const { PDFDocument, PageSizes, degrees, grayscale, rgb } = require("pdf-lib");

const margin = 50;
const fontSizeTitle = 30;
const fontSizeLegend = 14;

// NOTE: In PDF-LIB - {x,y} options when used in drawXXX(..., {x, y})  mean the left-bottom corner,
// e.g. like normal mathematical axises (they don't mean the left-top corner like in the other PDF libs)

// TODO: make the page size A4, A7 (etc...) be dynamic and depend on the images,
//  no need for small sized images to use A4 format

/**
 * @param {string[]} images
 * @param {string} filename
 * @param {string} [title]
 * @param {boolean} [log]
 */
module.exports = async function make(images, filename, title, log = false) {
  const doc = await PDFDocument.create();

  if (title) {
    const page = doc.addPage();
    page.drawText(title, {
      x: 100,
      y: 100,
      size: fontSizeTitle,
    });
  }

  let pageCount = 0;
  for (const imageSrc of images) {
    await addImage(doc, imageSrc, ++pageCount, log);
  }

  const pdfBytes = await doc.save();
  await fs.writeFile(filename, pdfBytes);
};

/**
 * @param {PDFDocument} doc
 * @param {string} imageSrc
 * @param {number} pageNumber
 * @param {boolean} log
 */
async function addImage(
  doc,
  imageSrc,
  pageNumber,
  pageSize = PageSizes.A4,
  log
) {
  // allow only PNG an JPG
  const isPng = imageSrc.endsWith(".png");
  if (!isPng && !(imageSrc.endsWith(".jpg") || imageSrc.endsWith(".jpeg"))) {
    if (log) console.error(`Image ${imageSrc} is neither PNG nor JPG`);
    return;
  }

  const imageBytes = await fs.readFile(imageSrc);
  const image = await (isPng
    ? doc.embedPng(imageBytes)
    : doc.embedPng(imageBytes));
  const { width: imageOrigWidth, height: imageOrigHeight } = image.size();

  let layout = pageSize;
  // make landscape if needed
  if (imageOrigWidth > imageOrigHeight) layout = [...layout].reverse(); // reverse is mutating the source array

  const page = doc.addPage(layout);

  const { width, height } = page.getSize();

  const imageSize = image.scaleToFit(width - 2 * margin, height - 2 * margin);

  if (log) {
    console.log(" ---------- ");
    console.log(`Page ${pageNumber} : ${width}x${height}`);
    console.log(`Image Original : ${imageOrigWidth}x${imageOrigHeight}`);
    console.log(`Image Scaled : ${image.width}x${imageSize.height}`);
  }

  // page.drawRectangle({
  //   x: (width - imageSize.width) / 2,
  //   y: (height - imageSize.height) / 2,
  //   width: imageSize.width,
  //   height: imageSize.height,

  //   borderWidth: 5,
  //   borderColor: grayscale(0.5),
  //   color: rgb(0.75, 0.2, 0.2),
  //   opacity: 0.5,
  //   borderOpacity: 0.75,
  //   //   rotate: degrees(-15),
  // });

  page.drawImage(image, {
    x: (width - imageSize.width) / 2,
    y: (height - imageSize.height) / 2,
    width: imageSize.width,
    height: imageSize.height,
  });

  page.drawText(`Page ${pageNumber}`, {
    x: margin / 2,
    y: margin / 2,
    size: fontSizeLegend,
  });
}
