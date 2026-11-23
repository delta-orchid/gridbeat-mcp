import type PDFKit from "pdfkit";
import { NOTE_BY_NAME } from "../../constants.js";
import { GridInstrumentShape, GridPosition } from "../../types.js";
import { buildBackgroundGrid } from "../../utils/instrumentGridBuilder.js";
import { CardBox } from "../layoutEngine.js";
import { ThemePalette } from "../themes.js";

export function renderGridShape(
  doc: PDFKit.PDFDocument,
  shape: GridInstrumentShape,
  rootNoteNumber: number,
  box: CardBox,
  theme: ThemePalette,
): void {
  const rows = shape.dimensions.rows || 8;
  const cols = shape.dimensions.columns || 8;

  const gridSide = Math.min(box.diagramWidth, box.diagramHeight);
  const startX = box.diagramX + (box.diagramWidth - gridSide) / 2;
  const startY = box.diagramY + (box.diagramHeight - gridSide) / 2;

  const gap = Math.max(1.5, gridSide * 0.014);
  const padSize = (gridSide - gap * (cols - 1)) / cols;
  const cornerRadius = Math.max(1.5, padSize * 0.12);

  const bgGrid = buildBackgroundGrid(shape, rootNoteNumber);
  const activeMap = new Map<string, GridPosition>();
  for (const pos of shape.activePositions) {
    activeMap.set(`${pos.row}:${pos.column}`, pos);
  }

  // Render top-to-bottom: row 7 at top, row 0 at bottom (hardware orientation)
  for (let visualRow = 0; visualRow < rows; visualRow++) {
    const dataRow = rows - 1 - visualRow;
    for (let col = 0; col < cols; col++) {
      const px = startX + col * (padSize + gap);
      const py = startY + visualRow * (padSize + gap);

      const active = activeMap.get(`${dataRow}:${col}`);
      const bgCell = bgGrid[dataRow]?.[col];

      if (active) {
        const noteMeta = NOTE_BY_NAME.get(active.note);
        let fillColor = noteMeta?.color ?? "#3b82f6";
        let textColor = noteMeta?.textColor ?? "#ffffff";

        if (theme.name === "bw") {
          fillColor = active.isRoot ? theme.bwRootBg : theme.bwChordBg;
          textColor = active.isRoot ? theme.bwRootText : theme.bwChordText;
        }

        doc.save();
        doc
          .roundedRect(px, py, padSize, padSize, cornerRadius)
          .fillColor(fillColor)
          .fill();

        if (active.isRoot) {
          doc
            .roundedRect(px, py, padSize, padSize, cornerRadius)
            .lineWidth(Math.max(1.5, padSize * 0.08))
            .strokeColor(theme.rootBorder)
            .stroke();

          // Small root dot indicator in top-right corner
          const dotR = Math.max(1.5, padSize * 0.08);
          doc
            .circle(px + padSize - dotR * 1.6, py + dotR * 1.6, dotR)
            .fillColor(theme.rootBorder)
            .fill();
        } else {
          doc
            .roundedRect(px, py, padSize, padSize, cornerRadius)
            .lineWidth(0.75)
            .strokeColor(theme.chordBorder)
            .stroke();
        }

        const showPitch = padSize >= 28;
        const noteFontSize = Math.max(6, Math.min(14, padSize * 0.36));
        doc
          .font("Helvetica-Bold")
          .fontSize(noteFontSize)
          .fillColor(textColor)
          .text(
            active.note,
            px,
            py +
              (showPitch
                ? padSize * 0.24
                : (padSize - noteFontSize) / 2 - 1),
            {
              width: padSize,
              align: "center",
              lineBreak: false,
            },
          );

        if (showPitch) {
          const pitchFontSize = Math.max(5, Math.min(9, padSize * 0.22));
          doc
            .font("Helvetica")
            .fontSize(pitchFontSize)
            .fillColor(textColor)
            .text(active.pitch, px, py + padSize * 0.62, {
              width: padSize,
              align: "center",
              lineBreak: false,
            });
        }
        doc.restore();
      } else {
        doc.save();
        doc
          .roundedRect(px, py, padSize, padSize, cornerRadius)
          .fillColor(theme.inactiveCellBg)
          .fillAndStroke(theme.inactiveCellBg, theme.inactiveCellBorder);

        if (padSize >= 17 && bgCell) {
          const faintSize = Math.max(5, Math.min(9, padSize * 0.27));
          doc
            .font("Helvetica")
            .fontSize(faintSize)
            .fillColor(theme.inactiveCellText)
            .text(
              bgCell.note.name,
              px,
              py + (padSize - faintSize) / 2 - 0.5,
              {
                width: padSize,
                align: "center",
                lineBreak: false,
              },
            );
        }
        doc.restore();
      }
    }
  }
}
