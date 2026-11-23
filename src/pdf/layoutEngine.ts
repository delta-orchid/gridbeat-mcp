import {
  ChordShapeRequestConfig,
  Instrument,
  PageOrientation,
  PageSize,
} from "../types.js";

export interface PageDimensions {
  width: number;
  height: number;
  orientation: PageOrientation;
  pageSize: PageSize;
}

export interface CardBox {
  chordIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  diagramX: number;
  diagramY: number;
  diagramWidth: number;
  diagramHeight: number;
}

export interface PageLayout {
  pageIndex: number;
  columns: number;
  rows: number;
  cards: CardBox[];
}

const PAGE_POINTS: Record<PageSize, { short: number; long: number }> = {
  LETTER: { short: 612, long: 792 },
  A4: { short: 595.28, long: 841.89 },
};

export const PAGE_MARGIN = 22;
export const CARD_GAP = 10;
export const CARD_PADDING = 6;
export const CARD_HEADER_HEIGHT = 22;
export const FIRST_PAGE_HEADER_HEIGHT = 48;
export const CONTINUATION_HEADER_HEIGHT = 20;

export function getOrientationForInstrument(
  instrument: Instrument,
): PageOrientation {
  return instrument === "push" || instrument === "launchpad"
    ? "portrait"
    : "landscape";
}

export function getPageDimensions(
  instrument: Instrument,
  pageSize: PageSize = "LETTER",
): PageDimensions {
  const orientation = getOrientationForInstrument(instrument);
  const base = PAGE_POINTS[pageSize];
  const width = orientation === "portrait" ? base.short : base.long;
  const height = orientation === "portrait" ? base.long : base.short;
  return { width, height, orientation, pageSize };
}

function getTargetAspectRatio(
  instrument: Instrument,
  config?: ChordShapeRequestConfig,
): number {
  switch (instrument) {
    case "push":
    case "launchpad":
      return 1.0;
    case "piano": {
      const octaves = config?.octaves ?? 2;
      return octaves === 1 ? 2.1 : octaves === 2 ? 3.2 : octaves === 3 ? 4.4 : 5.4;
    }
    case "guitar": {
      const frets = config?.guitarFrets ?? 12;
      return Math.max(1.8, 0.9 + frets * 0.28);
    }
    case "ukulele": {
      const frets = config?.ukuleleFrets ?? 12;
      return Math.max(2.0, 1.1 + frets * 0.34);
    }
  }
}

function getMaxPerPage(
  instrument: Instrument,
  config?: ChordShapeRequestConfig,
): number {
  if (instrument === "push" || instrument === "launchpad") {
    return 12; // up to 3x4 on portrait
  }
  if (instrument === "piano") {
    const octaves = config?.octaves ?? 2;
    return octaves >= 3 ? 4 : 8;
  }
  if (instrument === "guitar") {
    const frets = config?.guitarFrets ?? 12;
    return frets >= 9 ? 6 : 8;
  }
  // ukulele
  const frets = config?.ukuleleFrets ?? 12;
  return frets >= 9 ? 8 : 10;
}

function getCandidateColumns(
  instrument: Instrument,
  config?: ChordShapeRequestConfig,
): number[] {
  if (instrument === "push" || instrument === "launchpad") {
    return [1, 2, 3];
  }
  if (instrument === "piano") {
    const octaves = config?.octaves ?? 2;
    return octaves >= 3 ? [1] : [1, 2];
  }
  return [1, 2];
}

export function chooseOptimalGrid(
  countOnPage: number,
  areaWidth: number,
  areaHeight: number,
  instrument: Instrument,
  config?: ChordShapeRequestConfig,
): { columns: number; rows: number } {
  const candidates = getCandidateColumns(instrument, config);
  const aspect = getTargetAspectRatio(instrument, config);

  let bestCols = 1;
  let bestRows = countOnPage;
  let bestArea = -1;

  for (const cols of candidates) {
    if (cols > countOnPage && countOnPage > 1 && cols > 2) continue;
    const effectiveCols = Math.min(cols, Math.max(1, countOnPage));
    const rows = Math.ceil(countOnPage / effectiveCols);

    const cellW = (areaWidth - (effectiveCols - 1) * CARD_GAP) / effectiveCols;
    const cellH = (areaHeight - (rows - 1) * CARD_GAP) / rows;

    const availDiagW = Math.max(10, cellW - CARD_PADDING * 2);
    const availDiagH = Math.max(
      10,
      cellH - CARD_PADDING * 2 - CARD_HEADER_HEIGHT,
    );

    const renderedW = Math.min(availDiagW, availDiagH * aspect);
    const renderedH = renderedW / aspect;
    const diagramArea = renderedW * renderedH;

    if (diagramArea > bestArea + 0.5) {
      bestArea = diagramArea;
      bestCols = effectiveCols;
      bestRows = rows;
    }
  }

  return { columns: bestCols, rows: bestRows };
}

export function computePageLayouts(
  totalChords: number,
  instrument: Instrument,
  pageSize: PageSize = "LETTER",
  config?: ChordShapeRequestConfig,
): { dimensions: PageDimensions; pages: PageLayout[] } {
  const dimensions = getPageDimensions(instrument, pageSize);
  const maxPerPage = getMaxPerPage(instrument, config);
  const pages: PageLayout[] = [];

  if (totalChords === 0) {
    return { dimensions, pages };
  }

  let offset = 0;
  let pageIndex = 0;

  while (offset < totalChords) {
    const remaining = totalChords - offset;
    const countOnPage = Math.min(remaining, maxPerPage);

    const topHeader =
      pageIndex === 0 ? FIRST_PAGE_HEADER_HEIGHT : CONTINUATION_HEADER_HEIGHT;
    const areaX = PAGE_MARGIN;
    const areaY = PAGE_MARGIN + topHeader;
    const areaWidth = dimensions.width - PAGE_MARGIN * 2;
    const areaHeight = dimensions.height - PAGE_MARGIN * 2 - topHeader;

    const { columns, rows } = chooseOptimalGrid(
      countOnPage,
      areaWidth,
      areaHeight,
      instrument,
      config,
    );

    const cellW = (areaWidth - (columns - 1) * CARD_GAP) / columns;
    const cellH = (areaHeight - (rows - 1) * CARD_GAP) / rows;

    const cards: CardBox[] = [];
    for (let i = 0; i < countOnPage; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = areaX + col * (cellW + CARD_GAP);
      const y = areaY + row * (cellH + CARD_GAP);

      cards.push({
        chordIndex: offset + i,
        x,
        y,
        width: cellW,
        height: cellH,
        headerHeight: CARD_HEADER_HEIGHT,
        diagramX: x + CARD_PADDING,
        diagramY: y + CARD_PADDING + CARD_HEADER_HEIGHT,
        diagramWidth: cellW - CARD_PADDING * 2,
        diagramHeight: cellH - CARD_PADDING * 2 - CARD_HEADER_HEIGHT,
      });
    }

    pages.push({ pageIndex, columns, rows, cards });
    offset += countOnPage;
    pageIndex++;
  }

  return { dimensions, pages };
}
