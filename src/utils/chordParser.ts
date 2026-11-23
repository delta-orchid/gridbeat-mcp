import { CHORDS, NOTES } from "../constants.js";
import {
  ChordInput,
  ChordShapeRequestConfig,
  Note,
  ParsedChordQuery,
  ScaleName,
} from "../types.js";

const CHORD_ALIAS_MAP: Record<string, { apiName: string; suffix: string }> = {
  "": { apiName: "Major", suffix: "" },
  maj: { apiName: "Major", suffix: "" },
  major: { apiName: "Major", suffix: "" },
  m: { apiName: "Minor", suffix: "m" },
  "-": { apiName: "Minor", suffix: "m" },
  min: { apiName: "Minor", suffix: "m" },
  minor: { apiName: "Minor", suffix: "m" },
  dim: { apiName: "Diminished", suffix: "dim" },
  diminished: { apiName: "Diminished", suffix: "dim" },
  aug: { apiName: "Augmented", suffix: "aug" },
  augmented: { apiName: "Augmented", suffix: "aug" },
  "+": { apiName: "Augmented", suffix: "aug" },
  sus: { apiName: "Sustained", suffix: "sus4" },
  sus4: { apiName: "Sustained", suffix: "sus4" },
  sustained: { apiName: "Sustained", suffix: "sus4" },
  sus2: { apiName: "Sustained2", suffix: "sus2" },
  sustained2: { apiName: "Sustained2", suffix: "sus2" },
  "6": { apiName: "6th", suffix: "6" },
  "6th": { apiName: "6th", suffix: "6" },
  "7": { apiName: "7th", suffix: "7" },
  "7th": { apiName: "7th", suffix: "7" },
  dom7: { apiName: "7th", suffix: "7" },
  maj7: { apiName: "Maj7", suffix: "maj7" },
  major7: { apiName: "Maj7", suffix: "maj7" },
  "9": { apiName: "9", suffix: "9" },
  "9th": { apiName: "9", suffix: "9" },
  "5": { apiName: "5", suffix: "5" },
  power: { apiName: "5", suffix: "5" },
};

export function resolveRootNote(input: string | number): Note | undefined {
  if (typeof input === "number") {
    return NOTES.find((note) => parseInt(note.alias, 10) === input);
  }

  const str = input.trim();
  const numeric = parseInt(str, 10);
  if (
    !isNaN(numeric) &&
    numeric >= 1 &&
    numeric <= 12 &&
    String(numeric) === str
  ) {
    return NOTES.find((note) => parseInt(note.alias, 10) === numeric);
  }

  const normalized = str
    .replace(/#/g, "♯")
    .replace(/b/g, "♭")
    .toLowerCase();

  return NOTES.find((note) => {
    const nameMatch = note.name.toLowerCase() === normalized;
    const altMatch = note.altName && note.altName.toLowerCase() === normalized;
    return nameMatch || altMatch;
  });
}

function normalizeChordQuality(rawQuality: string): {
  apiChord: string;
  suffix: string;
} {
  const trimmed = rawQuality.trim();
  // Distinguish uppercase "M" (Major) from lowercase "m" (Minor) before lowercasing
  if (trimmed === "M") {
    return { apiChord: "Major", suffix: "" };
  }
  if (trimmed === "M7") {
    return { apiChord: "Maj7", suffix: "maj7" };
  }

  const lower = trimmed.toLowerCase();
  const mapped = CHORD_ALIAS_MAP[lower];
  if (mapped) {
    return { apiChord: mapped.apiName, suffix: mapped.suffix };
  }

  // Fallback to direct CHORDS match
  const exact = CHORDS.find((c) => c.name.toLowerCase() === lower);
  if (exact) {
    const aliasEntry = CHORD_ALIAS_MAP[exact.name.toLowerCase()];
    return {
      apiChord: exact.name,
      suffix: aliasEntry ? aliasEntry.suffix : ` ${exact.name}`,
    };
  }

  throw new Error(
    `Unsupported chord quality: "${rawQuality}". Supported: Major, Minor (m), Dim, Aug, Sus4, Sus2, 6th, 7th, Maj7, 9, 5, or custom intervals.`,
  );
}

export function parseChordInput(input: ChordInput): ParsedChordQuery {
  if (typeof input === "object" && input !== null) {
    const rootNote = resolveRootNote(input.root);
    if (!rootNote) {
      throw new Error(`Invalid root note: "${input.root}"`);
    }
    const rootNumber = parseInt(rootNote.alias, 10);

    if (Array.isArray(input.chord)) {
      if (input.chord.length < 3) {
        throw new Error("Custom chord interval array must have at least 3 numbers.");
      }
      const key = `${rootNumber}:[${input.chord.join(",")}]`;
      return {
        root: rootNote.name,
        rootNumber,
        chord: input.chord,
        canonicalKey: key,
        label: `${rootNote.name} [${input.chord.join(",")}]`,
      };
    }

    const chordStr = String(input.chord).trim();
    if (chordStr.includes(",")) {
      const parts = chordStr
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      if (parts.length >= 3) {
        return {
          root: rootNote.name,
          rootNumber,
          chord: parts,
          canonicalKey: `${rootNumber}:[${parts.join(",")}]`,
          label: `${rootNote.name} [${parts.join(",")}]`,
        };
      }
    }

    const { apiChord, suffix } = normalizeChordQuality(chordStr);
    return {
      root: rootNote.name,
      rootNumber,
      chord: apiChord,
      canonicalKey: `${rootNumber}:${apiChord}`,
      label: `${rootNote.name}${suffix}`,
    };
  }

  if (typeof input !== "string" || !input.trim()) {
    throw new Error(`Invalid chord input: ${JSON.stringify(input)}`);
  }

  const trimmed = input.trim();
  // Match root note (A-G followed by optional #/b/♯/♭) and the remainder as quality
  const match = trimmed.match(/^([A-Ga-g][#b♯♭]?)\s*(.*)$/);
  if (!match) {
    throw new Error(
      `Could not parse chord symbol "${input}". Expected format like "Am", "C", "F#m7", "BbMaj7", or "G7".`,
    );
  }

  const [, rawRoot, rawQuality] = match;
  // Normalize root letter uppercase, keep accidental as-is for resolveRootNote
  const rootFormatted =
    rawRoot.charAt(0).toUpperCase() + rawRoot.slice(1);
  const rootNote = resolveRootNote(rootFormatted);
  if (!rootNote) {
    throw new Error(`Invalid root note in "${input}": "${rawRoot}"`);
  }

  const rootNumber = parseInt(rootNote.alias, 10);
  const { apiChord, suffix } = normalizeChordQuality(rawQuality);

  return {
    root: rootNote.name,
    rootNumber,
    chord: apiChord,
    canonicalKey: `${rootNumber}:${apiChord}`,
    label: `${rootNote.name}${suffix}`,
  };
}

export function deduplicateChords(chords: ParsedChordQuery[]): {
  uniqueChords: ParsedChordQuery[];
  progressionLabels: string[];
} {
  const seen = new Set<string>();
  const uniqueChords: ParsedChordQuery[] = [];
  const progressionLabels: string[] = [];

  for (const chord of chords) {
    progressionLabels.push(chord.label);
    if (!seen.has(chord.canonicalKey)) {
      seen.add(chord.canonicalKey);
      uniqueChords.push(chord);
    }
  }

  return { uniqueChords, progressionLabels };
}

/**
 * For Ableton Push in `inKey` mode, lock scaleRootNote and scale to the first
 * chord in the progression unless explicitly overridden in `config`.
 */
export function resolveEffectiveConfig(
  chords: ParsedChordQuery[],
  config?: ChordShapeRequestConfig,
): ChordShapeRequestConfig | undefined {
  if (!config) return undefined;
  const resolved: ChordShapeRequestConfig = { ...config };

  if (resolved.pushMode === "inKey" && chords.length > 0) {
    const first = chords[0];
    if (resolved.scaleRootNote === undefined) {
      resolved.scaleRootNote = first.rootNumber;
    }
    if (resolved.scale === undefined) {
      let scaleName: ScaleName = "Major";
      if (typeof first.chord === "string") {
        if (
          first.chord === "Minor" ||
          first.chord === "Diminished"
        ) {
          scaleName = "Minor";
        }
      } else if (Array.isArray(first.chord) && first.chord[1] === 3) {
        scaleName = "Minor";
      }
      resolved.scale = scaleName;
    }
  }

  return resolved;
}
