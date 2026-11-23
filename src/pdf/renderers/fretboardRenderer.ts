import type PDFKit from "pdfkit";
import { NOTES, NOTE_BY_NAME } from "../../constants.js";
import { FretboardInstrumentShape, FretboardPosition } from "../../types.js";
import { CardBox } from "../layoutEngine.js";
import { ThemePalette } from "../themes.js";

export function renderFretboardShape(
  doc: PDFKit.PDFDocument,
  shape: FretboardInstrumentShape,
  box: CardBox,
  theme: ThemePalette,
): void {
  const frets = shape.frets || 12;
  const sortedTuning = [...shape.tuning].sort((a, b) => a.string - b.string);
  const numStrings = sortedTuning.length;

  const activeMap = new Map<string, FretboardPosition>();
  for (const pos of shape.activePositions) {
    activeMap.set(`${pos.string}:${pos.fret}`, pos);
  }

  const markerFrets =
    shape.instrument === "ukulele" ? [3, 5, 7, 10, 12] : [3, 5, 7, 9, 12];

  const openColRatio = 0.72;
  const totalColsRatio = openColRatio + frets;
  const headerH = Math.min(18, box.diagramHeight * 0.16);
  const availH = box.diagramHeight - headerH;

  const fretW = box.diagramWidth / totalColsRatio;
  const openW = fretW * openColRatio;
  const stringRowH = Math.min(availH / numStrings, fretW * 0.85);
  const totalBoardH = stringRowH * numStrings;

  const startX = box.diagramX;
  const startY = box.diagramY + (box.diagramHeight - (headerH + totalBoardH)) / 2;
  const boardY = startY + headerH;

  // 1. Fret number header
  const headerFontSize = Math.max(6, Math.min(10, headerH * 0.65));
  for (let f = 1; f <= frets; f++) {
    const fx = startX + openW + (f - 1) * fretW;
    const isMarker = markerFrets.includes(f);

    doc.save();
    if (isMarker) {
      doc
        .rect(fx + 1, startY + 1, fretW - 2, headerH - 2)
        .fillColor(theme.markerFretBg)
        .fill();
    }
    doc
      .font(isMarker ? "Helvetica-Bold" : "Helvetica")
      .fontSize(headerFontSize)
      .fillColor(isMarker ? theme.markerFretText : theme.subtitleText)
      .text(String(f), fx, startY + (headerH - headerFontSize) / 2, {
        width: fretW,
        align: "center",
        lineBreak: false,
      });
    doc.restore();
  }

  // 2. Fretboard background & grid lines
  doc.save();
  doc
    .rect(startX + openW, boardY, frets * fretW, totalBoardH)
    .fillColor(theme.inactiveCellBg)
    .fill();

  // Fret vertical lines
  for (let f = 1; f <= frets; f++) {
    const lx = startX + openW + f * fretW;
    doc
      .moveTo(lx, boardY)
      .lineTo(lx, boardY + totalBoardH)
      .lineWidth(0.75)
      .strokeColor(theme.fretLine)
      .stroke();
  }

  // Nut line (thick boundary between open string column and fret 1)
  doc
    .moveTo(startX + openW, boardY)
    .lineTo(startX + openW, boardY + totalBoardH)
    .lineWidth(2.5)
    .strokeColor(theme.nutLine)
    .stroke();

  // Outer border
  doc
    .rect(startX, boardY, openW + frets * fretW, totalBoardH)
    .lineWidth(0.75)
    .strokeColor(theme.cardBorder)
    .stroke();
  doc.restore();

  // 3. Strings and note positions
  for (let sIdx = 0; sIdx < numStrings; sIdx++) {
    const tuning = sortedTuning[sIdx];
    const rowY = boardY + sIdx * stringRowH;
    const midY = rowY + stringRowH / 2;

    // String horizontal line
    doc.save();
    doc
      .moveTo(startX + openW, midY)
      .lineTo(startX + openW + frets * fretW, midY)
      .lineWidth(0.8 + sIdx * 0.15)
      .strokeColor(theme.stringLine)
      .stroke();
    doc.restore();

    const startNoteIndex = NOTES.findIndex((n) => n.name === tuning.note);

    for (let f = 0; f <= frets; f++) {
      const colX = f === 0 ? startX : startX + openW + (f - 1) * fretW;
      const colW = f === 0 ? openW : fretW;
      const active = activeMap.get(`${tuning.string}:${f}`);

      if (active) {
        const noteMeta = NOTE_BY_NAME.get(active.note);
        let fill = noteMeta?.color ?? "#3b82f6";
        let textColor = noteMeta?.textColor ?? "#ffffff";
        if (theme.name === "bw") {
          fill = active.isRoot ? theme.bwRootBg : theme.bwChordBg;
          textColor = active.isRoot ? theme.bwRootText : theme.bwChordText;
        }

        const pillW = Math.min(colW - 3, stringRowH * 1.15);
        const pillH = Math.min(stringRowH - 3, pillW * 0.9);
        const pillX = colX + (colW - pillW) / 2;
        const pillY = rowY + (stringRowH - pillH) / 2;

        doc.save();
        doc
          .roundedRect(pillX, pillY, pillW, pillH, Math.min(4, pillH * 0.35))
          .fillColor(fill)
          .fill();

        doc
          .roundedRect(pillX, pillY, pillW, pillH, Math.min(4, pillH * 0.35))
          .lineWidth(active.isRoot ? 1.8 : 0.7)
          .strokeColor(active.isRoot ? theme.rootBorder : theme.chordBorder)
          .stroke();

        const noteSize = Math.max(5.5, Math.min(10, pillH * 0.56));
        doc
          .font("Helvetica-Bold")
          .fontSize(noteSize)
          .fillColor(textColor)
          .text(active.note, pillX, pillY + (pillH - noteSize) / 2 - 0.5, {
            width: pillW,
            align: "center",
            lineBreak: false,
          });
        doc.restore();
      } else if (f === 0) {
        // Show open string note name faintly
        const openNote = startNoteIndex >= 0 ? NOTES[startNoteIndex].name : tuning.note;
        const fontSize = Math.max(5.5, Math.min(9, stringRowH * 0.45));
        doc.save();
        doc
          .font("Helvetica")
          .fontSize(fontSize)
          .fillColor(theme.inactiveCellText)
          .text(openNote, colX, rowY + (stringRowH - fontSize) / 2 - 0.5, {
            width: colW,
            align: "center",
            lineBreak: false,
          });
        doc.restore();
      }
    }
  }
}
