import { describe, expect, it } from "vitest";
import {
  deduplicateChords,
  parseChordInput,
  resolveEffectiveConfig,
} from "../utils/chordParser.js";

describe("parseChordInput", () => {
  it("parses shorthand major, minor, 7th, and accidental chords", () => {
    expect(parseChordInput("C")).toMatchObject({
      root: "C",
      rootNumber: 1,
      chord: "Major",
      label: "C",
    });
    expect(parseChordInput("Am")).toMatchObject({
      root: "A",
      rootNumber: 10,
      chord: "Minor",
      label: "Am",
    });
    expect(parseChordInput("F#m")).toMatchObject({
      root: "F♯",
      rootNumber: 7,
      chord: "Minor",
      label: "F♯m",
    });
    expect(parseChordInput("Bb7")).toMatchObject({
      root: "A♯",
      rootNumber: 11,
      chord: "7th",
      label: "A♯7",
    });
    expect(parseChordInput("EbMaj7")).toMatchObject({
      root: "D♯",
      rootNumber: 4,
      chord: "Maj7",
      label: "D♯maj7",
    });
    expect(parseChordInput("Dsus4")).toMatchObject({
      root: "D",
      rootNumber: 3,
      chord: "Sustained",
      label: "Dsus4",
    });
  });

  it("parses explicit { root, chord } objects and custom interval arrays", () => {
    expect(parseChordInput({ root: "G", chord: "7th" })).toMatchObject({
      root: "G",
      rootNumber: 8,
      chord: "7th",
      label: "G7",
    });
    expect(parseChordInput({ root: 1, chord: [1, 4, 3] })).toMatchObject({
      root: "C",
      rootNumber: 1,
      chord: [1, 4, 3],
    });
  });

  it("throws on invalid chord strings", () => {
    expect(() => parseChordInput("H7")).toThrow();
    expect(() => parseChordInput("Cinvalid")).toThrow();
  });
});

describe("deduplicateChords", () => {
  it("preserves progression labels and deduplicates unique shapes in order", () => {
    const parsed = ["C", "G", "Am", "F", "C", "G", "A minor"].map(
      parseChordInput,
    );
    const { uniqueChords, progressionLabels } = deduplicateChords(parsed);
    expect(progressionLabels).toEqual(["C", "G", "Am", "F", "C", "G", "Am"]);
    expect(uniqueChords.map((c) => c.label)).toEqual(["C", "G", "Am", "F"]);
  });
});

describe("resolveEffectiveConfig", () => {
  it("locks scaleRootNote and scale to first chord in Push inKey mode", () => {
    const parsed = ["Am", "F", "G"].map(parseChordInput);
    const cfg = resolveEffectiveConfig(parsed, { pushMode: "inKey" });
    expect(cfg).toEqual({
      pushMode: "inKey",
      scaleRootNote: 10,
      scale: "Minor",
    });
  });

  it("respects explicit scaleRootNote and scale overrides", () => {
    const parsed = ["Am", "F", "G"].map(parseChordInput);
    const cfg = resolveEffectiveConfig(parsed, {
      pushMode: "inKey",
      scaleRootNote: 1,
      scale: "Major",
    });
    expect(cfg).toEqual({
      pushMode: "inKey",
      scaleRootNote: 1,
      scale: "Major",
    });
  });
});
