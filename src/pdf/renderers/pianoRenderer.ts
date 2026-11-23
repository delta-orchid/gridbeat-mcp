import type PDFKit from "pdfkit";
import { NOTES, NOTE_BY_NAME } from "../../constants.js";
import { KeyboardInstrumentShape, KeyboardPosition } from "../../types.js";
import { CardBox } from "../layoutEngine.js";
import { ThemePalette } from "../themes.js";

interface KeyGeom {
  keyIndex: number;
  noteName: string;
  isBlack: boolean;
  whiteIndex: number; // for white keys: 0..N-1; for black keys: preceding white key index
}

function buildPianoGeometry(octaves: number): {
  whiteKeys: KeyGeom[];
  blackKeys: KeyGeom[];
  totalWhite: number;
} {
  const whiteKeys: KeyGeom[] = [];
  const blackKeys: KeyGeom[] = [];

  let keyIndex = 0;
  let whiteCount = 0;

  for (let oct = 0; oct < octaves; oct++) {
    for (const note of NOTES) {
      if (note.natural) {
        whiteKeys.push({
          keyIndex,
          noteName: note.name,
          isBlack: false,
          whiteIndex: whiteCount,
        });
        whiteCount++;
      } else {
        blackKeys.push({
          keyIndex,
          noteName: note.name,
          isBlack: true,
          whiteIndex: whiteCount - 1,
        });
      }
      keyIndex++;
    }
  }

  // Final C key
  whiteKeys.push({
    keyIndex,
    noteName: NOTES[0].name,
    isBlack: false,
    whiteIndex: whiteCount,
  });
  whiteCount++;

  return { whiteKeys, blackKeys, totalWhite: whiteCount };
}

export function renderPianoShape(
  doc: PDFKit.PDFDocument,
  shape: KeyboardInstrumentShape,
  box: CardBox,
  theme: ThemePalette,
): void {
  const { whiteKeys, blackKeys, totalWhite } = buildPianoGeometry(
    shape.octaves,
  );

  const activeMap = new Map<number, KeyboardPosition>();
  for (const pos of shape.activePositions) {
    activeMap.set(pos.keyIndex, pos);
  }

  const maxW = box.diagramWidth;
  const maxH = box.diagramHeight;

  // Ideal white key aspect ~ 1 : 4.2, but allow stretching/fitting to fill card
  const whiteKeyW = maxW / totalWhite;
  const whiteKeyH = Math.min(maxH, whiteKeyW * 5.2);
  const startX = box.diagramX + (maxW - whiteKeyW * totalWhite) / 2;
  const startY = box.diagramY + (maxH - whiteKeyH) / 2;

  const blackKeyW = whiteKeyW * 0.62;
  const blackKeyH = whiteKeyH * 0.62;

  // 1. Draw white keys
  for (const wk of whiteKeys) {
    const kx = startX + wk.whiteIndex * whiteKeyW;
    const active = activeMap.get(wk.keyIndex);

    doc.save();
    if (active) {
      const noteMeta = NOTE_BY_NAME.get(active.note);
      let fill = noteMeta?.color ?? "#3b82f6";
      let textColor = noteMeta?.textColor ?? "#ffffff";
      if (theme.name === "bw") {
        fill = active.isRoot ? theme.bwRootBg : theme.bwChordBg;
        textColor = active.isRoot ? theme.bwRootText : theme.bwChordText;
      }

      doc.rect(kx, startY, whiteKeyW, whiteKeyH).fillColor(fill).fill();
      doc
        .rect(kx, startY, whiteKeyW, whiteKeyH)
        .lineWidth(active.isRoot ? 2 : 0.75)
        .strokeColor(active.isRoot ? theme.rootBorder : theme.pianoKeyBorder)
        .stroke();

      if (active.isRoot) {
        const r = Math.max(2, whiteKeyW * 0.14);
        doc
          .circle(kx + whiteKeyW / 2, startY + whiteKeyH - r * 2.2, r)
          .fillColor(theme.rootBorder)
          .fill();
      }

      const fontSize = Math.max(6, Math.min(12, whiteKeyW * 0.45));
      doc
        .font("Helvetica-Bold")
        .fontSize(fontSize)
        .fillColor(textColor)
        .text(
          active.note,
          kx,
          startY + whiteKeyH - fontSize - (active.isRoot ? 10 : 5),
          {
            width: whiteKeyW,
            align: "center",
            lineBreak: false,
          },
        );
    } else {
      doc
        .rect(kx, startY, whiteKeyW, whiteKeyH)
        .fillAndStroke(theme.pianoWhiteBg, theme.pianoKeyBorder);

      if (whiteKeyW >= 14) {
        const fontSize = Math.max(5, Math.min(8, whiteKeyW * 0.34));
        doc
          .font("Helvetica")
          .fontSize(fontSize)
          .fillColor(theme.inactiveCellText)
          .text(wk.noteName, kx, startY + whiteKeyH - fontSize - 4, {
            width: whiteKeyW,
            align: "center",
            lineBreak: false,
          });
      }
    }
    doc.restore();
  }

  // 2. Draw black keys on top
  for (const bk of blackKeys) {
    const kx = startX + (bk.whiteIndex + 1) * whiteKeyW - blackKeyW / 2;
    const active = activeMap.get(bk.keyIndex);

    doc.save();
    if (active) {
      const noteMeta = NOTE_BY_NAME.get(active.note);
      let fill = noteMeta?.color ?? "#3b82f6";
      let textColor = noteMeta?.textColor ?? "#ffffff";
      if (theme.name === "bw") {
        fill = active.isRoot ? theme.bwRootBg : theme.bwChordBg;
        textColor = active.isRoot ? theme.bwRootText : theme.bwChordText;
      }

      // Top 30% dark cap, bottom 70% note color (like GridBeat PianoKeyboard)
      const capH = blackKeyH * 0.28;
      doc
        .rect(kx, startY, blackKeyW, capH)
        .fillColor(theme.pianoBlackBg)
        .fill();
      doc
        .rect(kx, startY + capH, blackKeyW, blackKeyH - capH)
        .fillColor(fill)
        .fill();
      doc
        .rect(kx, startY, blackKeyW, blackKeyH)
        .lineWidth(active.isRoot ? 1.8 : 0.75)
        .strokeColor(active.isRoot ? theme.rootBorder : theme.pianoKeyBorder)
        .stroke();

      const fontSize = Math.max(5, Math.min(9, blackKeyW * 0.44));
      doc
        .font("Helvetica-Bold")
        .fontSize(fontSize)
        .fillColor(textColor)
        .text(active.note, kx, startY + blackKeyH - fontSize - 4, {
          width: blackKeyW,
          align: "center",
          lineBreak: false,
        });
    } else {
      doc
        .rect(kx, startY, blackKeyW, blackKeyH)
        .fillAndStroke(theme.pianoBlackBg, theme.pianoKeyBorder);
    }
    doc.restore();
  }
}
