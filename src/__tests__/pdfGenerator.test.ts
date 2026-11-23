import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateChordSheetPdf } from "../pdf/pdfGenerator.js";
import { ChordShapeResponse, Instrument, PdfTheme } from "../types.js";

const tempFiles: string[] = [];

afterEach(() => {
  for (const file of tempFiles.splice(0)) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
});

function makeMockChord(
  rootName: string,
  alias: string,
  chordName: string,
  instrument: Instrument,
): ChordShapeResponse {
  const base = {
    root: {
      name: rootName,
      alias,
      natural: true,
      color: "#de43dd",
      textColor: "white",
    },
    chord: {
      name: chordName,
      pattern: [1, 4, 3] as [number, number, number],
      description: "Test chord",
    },
    chordNotes: [rootName, "E", "G"],
  };

  if (instrument === "push" || instrument === "launchpad") {
    return {
      ...base,
      shapes: {
        [instrument]: {
          instrument,
          type: "grid",
          dimensions: { rows: 8, columns: 8, gridWidth: 8 },
          config:
            instrument === "push"
              ? { pushMode: "chromatic", pushLayout: "4ths" }
              : undefined,
          activePositions: [
            { row: 0, column: 0, note: rootName, pitch: `${rootName}2`, isRoot: true },
            { row: 0, column: 4, note: "E", pitch: "E2", isRoot: false },
            { row: 1, column: 2, note: "G", pitch: "G2", isRoot: false },
          ],
        },
      },
    };
  }

  if (instrument === "piano") {
    return {
      ...base,
      shapes: {
        piano: {
          instrument: "piano",
          type: "keyboard",
          octaves: 2,
          totalKeys: 25,
          activePositions: [
            { keyIndex: 0, octave: 0, note: rootName, pitch: `${rootName}2`, isRoot: true, isBlack: false },
            { keyIndex: 4, octave: 0, note: "E", pitch: "E2", isRoot: false, isBlack: false },
            { keyIndex: 7, octave: 0, note: "G", pitch: "G2", isRoot: false, isBlack: false },
          ],
        },
      },
    };
  }

  return {
    ...base,
    shapes: {
      [instrument]: {
        instrument,
        type: "fretboard",
        frets: 5,
        tuning:
          instrument === "guitar"
            ? [
                { string: 1, note: "E", octave: 4 },
                { string: 2, note: "B", octave: 3 },
                { string: 3, note: "G", octave: 3 },
                { string: 4, note: "D", octave: 3 },
                { string: 5, note: "A", octave: 2 },
                { string: 6, note: "E", octave: 2 },
              ]
            : [
                { string: 1, note: "G", octave: 4 },
                { string: 2, note: "C", octave: 4 },
                { string: 3, note: "E", octave: 4 },
                { string: 4, note: "A", octave: 3 },
              ],
        activePositions: [
          { string: 1, fret: 0, note: "E", pitch: "E4", isRoot: false },
          { string: 2, fret: 1, note: rootName, pitch: `${rootName}4`, isRoot: true },
        ],
      },
    },
  };
}

describe("generateChordSheetPdf", () => {
  const instruments: Instrument[] = [
    "push",
    "launchpad",
    "piano",
    "guitar",
    "ukulele",
  ];
  const themes: PdfTheme[] = ["color", "bw", "dark"];

  it.each(instruments)(
    "generates a valid PDF for %s",
    async (instrument) => {
      const outPath = path.join(
        os.tmpdir(),
        `gridbeat-test-${instrument}-${Date.now()}.pdf`,
      );
      tempFiles.push(outPath);

      const chords = [
        makeMockChord("C", "1", "Major", instrument),
        makeMockChord("G", "8", "Major", instrument),
        makeMockChord("A", "10", "Minor", instrument),
      ];

      const result = await generateChordSheetPdf({
        instrument,
        chords,
        progressionLabels: ["C", "G", "Am", "C"],
        title: `Test ${instrument} Song`,
        outputPath: outPath,
        theme: "color",
      });

      expect(result.outputPath).toBe(outPath);
      expect(result.pageCount).toBe(1);
      expect(fs.existsSync(outPath)).toBe(true);

      const buf = fs.readFileSync(outPath);
      expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(buf.length).toBeGreaterThan(1000);
    },
  );

  it.each(themes)("supports %s theme", async (theme) => {
    const outPath = path.join(
      os.tmpdir(),
      `gridbeat-test-theme-${theme}-${Date.now()}.pdf`,
    );
    tempFiles.push(outPath);

    const result = await generateChordSheetPdf({
      instrument: "push",
      chords: [makeMockChord("C", "1", "Major", "push")],
      progressionLabels: ["C"],
      outputPath: outPath,
      theme,
    });

    expect(fs.existsSync(result.outputPath)).toBe(true);
    expect(fs.statSync(result.outputPath).size).toBeGreaterThan(1000);
  });
});
