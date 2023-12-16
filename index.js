#! /usr/bin/env node

const process = require("node:process");
const path = require("node:path");
const fs = require("node:fs/promises");

const { glob } = require("glob");
const { termost, helpers } = require("termost");
const listr = require("listr2");
const {
  ListrEnquirerPromptAdapter,
} = require("@listr2/prompt-adapter-enquirer");
// const { Confirm } = require("enquirer");

const imagesToPdf = require("./lib/images.js");
const mergePdfs = require("./lib/merge.js");
const rotatePdfs = require("./lib/rotate.js");

class ValidationError extends Error {
  constructor(message) {
    super(message);
  }
}

/**
 * @param {string} str
 */
const logTaskOutput = (str) => {
  // add 2 whitespaces
  console.log(helpers.format(`${str}\n`, { color: "grey" }));
};

/*
 * Usage:
 * node index.js -in imagesFolder -out outFile.pdf --title="Topo Manikia" -h
 */

const program = termost("PDF creation", {
  onException(error) {
    if (error instanceof ValidationError) {
      // the error is already logged so don't do anything
      //   helpers.message(error.message, { type: "warning" });
    } else console.error(`Error logic ${error.message}`);
  },
  onShutdown() {
    console.log("Clean-up logic");
  },
});

program
  .command({
    name: "images",
    description: "Create a PDF from a folder with images",
  })
  .option({
    key: "outFilename",
    name: { long: "out", short: "o" },
    description: `Output PDF file.
                 The ".pdf" extension is auto added if not missing.
                 If not passed will be "{images-folder-name}.pdf".
                 If such already file exists will exit.
                 [Optional]
    `,
  })
  .option({
    key: "inFolder",
    name: { long: "in", short: "i" },
    description: `Input folder with images.
                 If not passed will be current folder.
                 [Optional]`,
    defaultValue: ".",
  })
  .option({
    key: "title",
    name: { long: "title", short: "t" },
    description: `Title for the first page.
                 [Optional]`,
  })
  .option({
    key: "degrees",
    name: { long: "rotate", short: "r" },
    description: `Rotate the image before inserting them in the PDF.
                 [Optional]
    `,
    defaultValue: 0
  })
  .task({
    key: "images",
    label: "Validate PNG/JPG images",
    async handler(context) {
      const inFolder = path.resolve(process.cwd(), context.inFolder);
      
      const images = await glob(`${inFolder}/*.{png,jpg,jpeg}`);

      if (!images.length) throw new ValidationError("Found no images");

      logTaskOutput(`Found ${images.length} images`);

      // sort alphabetically using native algorithm
      images.sort();

      return images;
    },
  })
  .task(createTaskOutFile())
  .task({
    label: "Generate PDF",
    handler: async (context, argv) => {
      // console.log(argv);
      // console.log(context);
      await imagesToPdf(context.images, context.outFile, context.title, context.degrees, false);
    },
  })
  .task(
    createTaskSuccess(
      (context) => `Created PDF with ${context.images.length} images`
    )
  );

program
  .command({
    name: "merge",
    description: "Create a single merged PDF from a folder with PDFs",
  })
  .option({
    key: "outFilename",
    name: { long: "out", short: "o" },
    description: `Output PDF file.
                 The ".pdf" extension is auto added if not missing.
                 If not passed will be "{pdfs-folder-name}.pdf".
                 If such already file exists will exit.
                 [Optional]
    `,
  })
  .option({
    key: "inFolder",
    name: { long: "in", short: "i" },
    description: `Input folder with PDFs.
                 If not passed will be current folder.
                 [Optional]`,
    defaultValue: ".",
  })
  .option({
    key: "title",
    name: { long: "title", short: "t" },
    description: `Title for the first page.
                 [Optional]`,
  })
  .task(createTaskValidatePDFs())
  .task(createTaskOutFile())
  .task({
    label: "Generate PDF",
    handler: async (context, argv) => {
      await mergePdfs(context.pdfs, context.outFile, context.title, false);
    },
  })
  .task(
    createTaskSuccess(
      (context) => `Created single PDF from ${context.pdfs.length} PDFs`
    )
  );

program
  .command({
    name: "rotate",
    description: "Rotate a single PDF or all PDFs inside a folder",
  })
  .option({
    key: "inFolder",
    name: { long: "in", short: "i" },
    description: `Input folder with PDFs.
                 If not passed will be current folder.
                 [Optional]`,
    defaultValue: ".",
  })
  .option({
    key: "overwrite",
    name: { long: "overwrite", short: "w" },
    description: `Whether to overwrite the inout PDF(s) with the rotated ones.
                 False if not specified.`,
    defaultValue: false,
  })
  .input({
    type: "select",
    key: "degrees",
    label:
      "Degrees angle with which to rotate each page. Note that rotation is page's property, so if applying multiple rotations only the last one is set?",
    options: ["0", "90", "180", "270"],
    defaultValue: "180",
  })
  .task(createTaskValidatePDFs())
  .task({
    label: (context) => `Rotate PDF${context.pdfs.length > 1 ? "s" : ""}`,
    handler: async (context, argv) => {
      await rotatePdfs(
        context.pdfs,
        +context.degrees,
        context.overwrite,
        false
      );
    },
  })
  .task(
    createTaskSuccess(
      (context) => `Rotated PDF${context.pdfs.length ? "s" : ""}`
    )
  );

function createTaskValidatePDFs() {
  return {
    key: "pdfs",
    label: "Validate PDFs",
    async handler(context) {
      const inFolder = path.resolve(process.cwd(), context.inFolder);
      const pdfs = await glob(`${inFolder}/*.pdf`);

      if (!pdfs.length) throw new ValidationError("Found no PDFs");

      logTaskOutput(`Found ${pdfs.length} PDFs`);

      // sort alphabetically using native algorithm
      pdfs.sort();

      return pdfs;
    },
  };
}

function createTaskOutFile() {
  return {
    // key: "outFile",  // the context is used explicitly inside and passed to Listr
    // label: "Get the output file",
    async handler(context) {
      if (!context.outFilename) {
        const inFolder = path.resolve(process.cwd(), context.inFolder);
        context.outFilename = path.basename(inFolder);
      }
      if (!context.outFilename.endsWith(".pdf")) context.outFilename += ".pdf";

      // use Listr as it's actually used internally by termost
      await new listr.Listr(
        [
          {
            title: "Validate the output file",
            task: async (ctx, task) => {
              const outFile = path.resolve(process.cwd(), ctx.outFilename);
              ctx.outFile = outFile;

              //   task.output = "writing something here";
              //   task.output = "writing something more here";
              //   await listr.delay(1000);

              let isExist;
              try {
                stats = await fs.stat(outFile);
                isExist = stats.isFile();
              } catch (error) {
                isExist = false;
              }

              if (isExist) {
                const replace = await task
                  .prompt(ListrEnquirerPromptAdapter)
                  .run({
                    type: "confirm",
                    message:
                      "Output file is already existing, do you want to replace it?",
                  });

                if (!replace) {
                  // // throwing an error with message will replace the title,
                  // // so just throw "empty" error - which will fail the spinner only
                  // throw new Error();

                  throw new ValidationError("Output file is already existing");
                }
                logTaskOutput(`Will overwrite the existing ${outFile}`);
              } else {
                logTaskOutput(`Will create a new ${outFile}`);
              }
            },
            // persist all the outputs
            rendererOptions: { persistentOutput: true, outputBar: Infinity },
            //   exitOnError: false,
          },
        ],
        {
          concurrent: false,
        }
      ).run(context);
    },
  };
}

/**
 * @param {(context: any) => string} createMessage
 */
function createTaskSuccess(createMessage) {
  return {
    handler: async (context, argv) => {
      helpers.message(createMessage(context), {
        type: "success",
      });
    },
  };
}
