export type GridWidth = 2 | 3 | 4 | 5 | 8;
export type PushLayout = "4ths" | "3rds" | "sequent";
export type PushMode = "chromatic" | "inKey";
export type OctaveLength = 1 | 2 | 3 | 4;
export type Instrument = "guitar" | "ukulele" | "launchpad" | "push" | "piano";
export type GuitarFrets = 3 | 5 | 7 | 9 | 12;
export type UkuleleFrets = 3 | 5 | 7 | 9 | 12;
export type ScaleName = "Major" | "Minor";

export type Interval = [number, number, number, ...number[]];

export interface Chord {
  name: string;
  pattern: Interval;
  description: string;
}

export interface Note {
  name: string;
  altName?: string;
  alias: string;
  natural: boolean;
  color: string;
  textColor: string;
}

export type ScaleInterval = 1 | 2 | 3;

export interface Scale {
  name: ScaleName;
  pattern: ScaleInterval[];
  description: string;
  category?: "Western";
  noteCount: 5 | 6 | 7 | 8 | 9;
}

export interface GridPosition {
  row: number;
  column: number;
  note: string;
  pitch: string;
  isRoot: boolean;
}

export interface FretboardPosition {
  string: number;
  fret: number;
  note: string;
  pitch: string;
  isRoot: boolean;
}

export interface KeyboardPosition {
  keyIndex: number;
  octave: number;
  note: string;
  pitch: string;
  isRoot: boolean;
  isBlack: boolean;
}

export interface GridInstrumentShape {
  instrument: "launchpad" | "push";
  type: "grid";
  dimensions: {
    rows: number;
    columns: number;
    gridWidth?: number;
  };
  config?: {
    pushMode?: PushMode;
    pushLayout?: PushLayout;
    scale?: ScaleName;
    scaleRootNote?: number;
  };
  activePositions: GridPosition[];
}

export interface StringTuning {
  string: number;
  note: string;
  octave: number;
}

export interface FretboardInstrumentShape {
  instrument: "guitar" | "ukulele";
  type: "fretboard";
  frets: number;
  tuning: StringTuning[];
  activePositions: FretboardPosition[];
}

export interface KeyboardInstrumentShape {
  instrument: "piano";
  type: "keyboard";
  octaves: number;
  totalKeys: number;
  activePositions: KeyboardPosition[];
}

export type InstrumentShape =
  | GridInstrumentShape
  | FretboardInstrumentShape
  | KeyboardInstrumentShape;

export interface ChordShapeRequestConfig {
  gridWidth?: GridWidth;
  pushMode?: PushMode;
  pushLayout?: PushLayout;
  scale?: ScaleName;
  scaleRootNote?: number;
  guitarFrets?: GuitarFrets;
  ukuleleFrets?: UkuleleFrets;
  octaves?: OctaveLength;
}

export interface ChordShapeRequest {
  root: string | number;
  chord: string | number[];
  instruments?: Instrument[];
  config?: ChordShapeRequestConfig;
}

export interface ChordShapeResponse {
  root: Note;
  chord: Chord;
  chordNotes: string[];
  shapes: Partial<Record<Instrument, InstrumentShape>>;
}

export type ChordInput =
  | string
  | {
      root: string | number;
      chord: string | number[];
    };

export interface ParsedChordQuery {
  root: string;
  rootNumber: number;
  chord: string | number[];
  canonicalKey: string;
  label: string;
}

export type PdfTheme = "color" | "bw" | "dark";
export type PageSize = "LETTER" | "A4";
export type PageOrientation = "portrait" | "landscape";

export interface PdfGenerationOptions {
  instrument: Instrument;
  chords: ChordShapeResponse[];
  progressionLabels: string[];
  title?: string;
  outputPath?: string;
  theme?: PdfTheme;
  pageSize?: PageSize;
  config?: ChordShapeRequestConfig;
}

export interface PdfGenerationResult {
  outputPath: string;
  pageCount: number;
  orientation: PageOrientation;
  pageSize: PageSize;
  instrument: Instrument;
  uniqueChords: string[];
  progression: string[];
}
