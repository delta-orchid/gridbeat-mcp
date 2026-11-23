import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import {
  ChordShapeRequestConfig,
  ChordShapeResponse,
  FretboardInstrumentShape,
  GridInstrumentShape,
  Instrument,
  KeyboardInstrumentShape,
  PageSize,
  PdfGenerationOptions,
  PdfGenerationResult,
} from "../types.js";
import {
  CARD_PADDING,
  CONTINUATION_HEADER_HEIGHT,
  FIRST_PAGE_HEADER_HEIGHT,
  PAGE_MARGIN,
  computePageLayouts,
} from "./layoutEngine.js";
import { renderFretboardShape } from "./renderers/fretboardRenderer.js";
import { renderGridShape } from "./renderers/gridRenderer.js";
import { renderPianoShape } from "./renderers/pianoRenderer.js";
import { THEMES, ThemePalette } from "./themes.js";

function sanitizeFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/[♯#]/g, "sharp")
    .replace(/[♭]/g, "b")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function resolveOutputPath(
  options: PdfGenerationOptions,
  uniqueLabels: string[],
): string {
  if (options.outputPath) {
    return path.resolve(options.outputPath);
  }
  const baseName = options.title
    ? sanitizeFilename(options.title)
    : sanitizeFilename(uniqueLabels.join("-") || "chords");
  const filename = `${baseName || "chord-sheet"}-${options.instrument}.pdf`;
  return path.resolve(process.cwd(), filename);
}

function formatInstrumentBadge(
  instrument: Instrument,
  config?: ChordShapeRequestConfig,
): string {
  switch (instrument) {
    case "push": {
      const mode = config?.pushMode ?? "chromatic";
      const layout = config?.pushLayout ?? "4ths";
      if (mode === "inKey" && config?.scale) {
        return `Ableton Push · inKey (${config.scale}, ${layout})`;
      }
      return `Ableton Push · ${mode} (${layout})`;
    }
    case "launchpad":
      return `Launchpad · width ${config?.gridWidth ?? 8}`;
    case "piano":
      return `Piano · ${config?.octaves ?? 2} octaves`;
    case "guitar":
      return `Guitar · ${config?.guitarFrets ?? 12} frets`;
    case "ukulele":
      return `Ukulele · ${config?.ukuleleFrets ?? 12} frets`;
  }
}

function drawFirstPageHeader(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  options: PdfGenerationOptions,
  theme: ThemePalette,
): void {
  const usableW = pageWidth - PAGE_MARGIN * 2;
  const title =
    options.title?.trim() ||
    `Chord Sheet (${options.progressionLabels.slice(0, 4).join(" – ")}${options.progressionLabels.length > 4 ? " …" : ""})`;
  const badge = formatInstrumentBadge(options.instrument, options.config);

  doc.save();
  // Title on left
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(theme.titleText)
    .text(title, PAGE_MARGIN, PAGE_MARGIN, {
      width: usableW * 0.62,
      lineBreak: false,
      ellipsis: true,
    });

  // Instrument badge on right
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(theme.subtitleText)
    .text(badge, PAGE_MARGIN + usableW * 0.62, PAGE_MARGIN + 3, {
      width: usableW * 0.38,
      align: "right",
      lineBreak: false,
    });

  // Progression banner on second line
  const progText = `Progression: ${options.progressionLabels.join("  →  ")}`;
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(theme.subtitleText)
    .text(progText, PAGE_MARGIN, PAGE_MARGIN + 19, {
      width: usableW * 0.78,
      lineBreak: false,
      ellipsis: true,
    });

  // Compact Root legend on right
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(theme.subtitleText)
    .text("Bold border = Root", PAGE_MARGIN + usableW * 0.78, PAGE_MARGIN + 20, {
      width: usableW * 0.22,
      align: "right",
      lineBreak: false,
    });

  // Divider line
  doc
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + FIRST_PAGE_HEADER_HEIGHT - 8)
    .lineTo(pageWidth - PAGE_MARGIN, PAGE_MARGIN + FIRST_PAGE_HEADER_HEIGHT - 8)
    .lineWidth(0.75)
    .strokeColor(theme.cardBorder)
    .stroke();
  doc.restore();
}

function drawContinuationHeader(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pageNum: number,
  totalPages: number,
  options: PdfGenerationOptions,
  theme: ThemePalette,
): void {
  const usableW = pageWidth - PAGE_MARGIN * 2;
  doc.save();
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(theme.subtitleText)
    .text(
      `${options.title || "Chord Sheet"} — ${formatInstrumentBadge(options.instrument, options.config)}`,
      PAGE_MARGIN,
      PAGE_MARGIN,
      { width: usableW * 0.75, lineBreak: false, ellipsis: true },
    );
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(theme.subtitleText)
    .text(
      `Page ${pageNum} of ${totalPages}`,
      PAGE_MARGIN + usableW * 0.75,
      PAGE_MARGIN,
      { width: usableW * 0.25, align: "right", lineBreak: false },
    );
  doc
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + CONTINUATION_HEADER_HEIGHT - 6)
    .lineTo(
      pageWidth - PAGE_MARGIN,
      PAGE_MARGIN + CONTINUATION_HEADER_HEIGHT - 6,
    )
    .lineWidth(0.5)
    .strokeColor(theme.cardBorder)
    .stroke();
  doc.restore();
}

function drawChordCardHeader(
  doc: PDFKit.PDFDocument,
  chordResp: ChordShapeResponse,
  x: number,
  y: number,
  width: number,
  theme: ThemePalette,
): void {
  const chordLabel = `${chordResp.root.name} ${chordResp.chord.name}`;
  const notesLabel = chordResp.chordNotes.join(" · ");

  doc.save();
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor(theme.titleText)
    .text(chordLabel, x + CARD_PADDING, y + CARD_PADDING, {
      width: width * 0.52 - CARD_PADDING,
      lineBreak: false,
      ellipsis: true,
    });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(theme.subtitleText)
    .text(notesLabel, x + width * 0.48, y + CARD_PADDING + 2, {
      width: width * 0.52 - CARD_PADDING,
      align: "right",
      lineBreak: false,
      ellipsis: true,
    });
  doc.restore();
}

export async function generateChordSheetPdf(
  options: PdfGenerationOptions,
): Promise<PdfGenerationResult> {
  const theme = THEMES[options.theme ?? "color"];
  const pageSize: PageSize = options.pageSize ?? "LETTER";

  const { dimensions, pages } = computePageLayouts(
    options.chords.length,
    options.instrument,
    pageSize,
    options.config,
  );

  const uniqueChords = options.chords.map(
    (c) => `${c.root.name} ${c.chord.name}`,
  );
  const outputPath = resolveOutputPath(options, uniqueChords);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const doc = new PDFDocument({
    size: [dimensions.width, dimensions.height],
    margin: 0,
    autoFirstPage: false,
    info: {
      Title: options.title || `GridBeat ${options.instrument} Chord Sheet`,
      Creator: "gridbeat-mcp",
    },
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  for (const page of pages) {
    doc.addPage({
      size: [dimensions.width, dimensions.height],
      margin: 0,
    });

    // Page background
    if (theme.pageBg !== "#ffffff") {
      doc
        .rect(0, 0, dimensions.width, dimensions.height)
        .fillColor(theme.pageBg)
        .fill();
    }

    if (page.pageIndex === 0) {
      drawFirstPageHeader(doc, dimensions.width, options, theme);
    } else {
      drawContinuationHeader(
        doc,
        dimensions.width,
        page.pageIndex + 1,
        pages.length,
        options,
        theme,
      );
    }

    for (const card of page.cards) {
      const chordResp = options.chords[card.chordIndex];
      const shape = chordResp.shapes[options.instrument];
      if (!shape) {
        throw new Error(
          `Missing "${options.instrument}" shape in GridBeat API response for ${chordResp.root.name} ${chordResp.chord.name}.`,
        );
      }

      // Card container
      doc.save();
      doc
        .roundedRect(card.x, card.y, card.width, card.height, 4)
        .fillAndStroke(theme.cardBg, theme.cardBorder);
      doc.restore();

      drawChordCardHeader(doc, chordResp, card.x, card.y, card.width, theme);

      if (shape.type === "grid") {
        const rootNumber = parseInt(chordResp.root.alias, 10) || 1;
        renderGridShape(
          doc,
          shape as GridInstrumentShape,
          rootNumber,
          card,
          theme,
        );
      } else if (shape.type === "keyboard") {
        renderPianoShape(
          doc,
          shape as KeyboardInstrumentShape,
          card,
          theme,
        );
      } else if (shape.type === "fretboard") {
        renderFretboardShape(
          doc,
          shape as FretboardInstrumentShape,
          card,
          theme,
        );
      }
    }
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  return {
    outputPath,
    pageCount: pages.length,
    orientation: dimensions.orientation,
    pageSize: dimensions.pageSize,
    instrument: options.instrument,
    uniqueChords,
    progression: options.progressionLabels,
  };
}
