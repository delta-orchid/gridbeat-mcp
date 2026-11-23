import { NOTES, SCALES } from "../constants.js";
import {
  GridInstrumentShape,
  Note,
  PushLayout,
  PushMode,
  Scale,
  ScaleName,
} from "../types.js";

export interface GridCell {
  note: Note;
  absoluteSemitones: number;
}

const normalizePosition = (position: number): number => {
  let normalized = position % 12;
  if (normalized < 0) normalized += 12;
  return normalized;
};

const getPushChromaticRowStep = (layout: PushLayout): number => {
  switch (layout) {
    case "4ths":
      return 5;
    case "3rds":
      return 4;
    case "sequent":
      return 8;
  }
};

const getPushInKeyRowStep = (
  layout: PushLayout,
  scaleLength: number = 7,
): number => {
  switch (layout) {
    case "4ths":
      return 3;
    case "3rds":
      return 2;
    case "sequent":
      return scaleLength;
  }
};

const resolveScale = (scaleName?: ScaleName): Scale => {
  if (scaleName) {
    return SCALES.find((s) => s.name === scaleName) ?? SCALES[0];
  }
  return SCALES[0];
};

const getScaleDegreeSemitones = (activeScale: Scale): number[] => {
  const offsets: number[] = [0];
  let acc = 0;
  for (let i = 0; i < activeScale.pattern.length - 1; i++) {
    acc += activeScale.pattern[i];
    offsets.push(acc);
  }
  return offsets;
};

export function buildBackgroundGrid(
  shape: GridInstrumentShape,
  rootNoteNumber: number,
): GridCell[][] {
  if (shape.instrument === "launchpad") {
    const width = shape.dimensions.gridWidth ?? 8;
    const rowStep = [2, 3, 4, 5, 8].includes(width) ? width : 8;
    const grid: GridCell[][] = [];
    for (let row = 0; row < 8; row++) {
      const gridRow: GridCell[] = [];
      for (let column = 0; column < 8; column++) {
        const absoluteSemitones = row * rowStep + column;
        const note = NOTES[normalizePosition(absoluteSemitones)];
        gridRow.push({ note, absoluteSemitones });
      }
      grid.push(gridRow);
    }
    return grid;
  }

  // Ableton Push
  const pushMode: PushMode = shape.config?.pushMode ?? "chromatic";
  const pushLayout: PushLayout = shape.config?.pushLayout ?? "4ths";
  const anchorNoteNumber = shape.config?.scaleRootNote ?? rootNoteNumber ?? 1;
  const anchorIndex = normalizePosition(anchorNoteNumber - 1);
  const grid: GridCell[][] = [];

  if (pushMode === "inKey") {
    const activeScale = resolveScale(shape.config?.scale);
    const degreeOffsets = getScaleDegreeSemitones(activeScale);
    const scaleLen = degreeOffsets.length;
    const rowDegreeStep = getPushInKeyRowStep(pushLayout, scaleLen);

    for (let row = 0; row < 8; row++) {
      const gridRow: GridCell[] = [];
      for (let column = 0; column < 8; column++) {
        const degreeIndex = row * rowDegreeStep + column;
        const octaveSemitones = Math.floor(degreeIndex / scaleLen) * 12;
        const degreeSemitones = degreeOffsets[degreeIndex % scaleLen];
        const absoluteSemitones =
          anchorIndex + octaveSemitones + degreeSemitones;
        const note = NOTES[normalizePosition(absoluteSemitones)];
        gridRow.push({ note, absoluteSemitones });
      }
      grid.push(gridRow);
    }
  } else {
    const rowStep = getPushChromaticRowStep(pushLayout);
    for (let row = 0; row < 8; row++) {
      const gridRow: GridCell[] = [];
      for (let column = 0; column < 8; column++) {
        const absoluteSemitones = anchorIndex + row * rowStep + column;
        const note = NOTES[normalizePosition(absoluteSemitones)];
        gridRow.push({ note, absoluteSemitones });
      }
      grid.push(gridRow);
    }
  }

  return grid;
}
