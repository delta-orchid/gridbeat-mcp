#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchMultipleChordShapes } from "./api/gridbeatClient.js";
import { generateChordSheetPdf } from "./pdf/pdfGenerator.js";
import {
  ChordInput,
  ChordShapeRequestConfig,
  Instrument,
  PageSize,
  PdfTheme,
} from "./types.js";
import {
  deduplicateChords,
  parseChordInput,
  resolveEffectiveConfig,
} from "./utils/chordParser.js";

const InstrumentEnum = z.enum([
  "push",
  "launchpad",
  "piano",
  "guitar",
  "ukulele",
]);

const ChordItemSchema = z.union([
  z
    .string()
    .describe(
      'Shorthand chord symbol such as "C", "Am", "F#m", "Bb7", "Emaj7", "Dsus4", "G5"',
    ),
  z.object({
    root: z
      .union([z.string(), z.number()])
      .describe('Root note name (e.g. "C", "F#", "Bb") or 1-12 index'),
    chord: z
      .union([z.string(), z.array(z.number())])
      .describe(
        'Chord name/alias (e.g. "Major", "Minor", "7th") or interval array (e.g. [1, 4, 3])',
      ),
  }),
]);

const LayoutConfigSchema = z
  .object({
    gridWidth: z
      .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(8)])
      .optional()
      .describe("Launchpad row step width (2, 3, 4, 5, or 8; default 8)"),
    pushMode: z
      .enum(["chromatic", "inKey"])
      .optional()
      .describe('Push mode: "chromatic" (default) or "inKey"'),
    pushLayout: z
      .enum(["4ths", "3rds", "sequent"])
      .optional()
      .describe('Push layout: "4ths" (default), "3rds", or "sequent"'),
    scale: z
      .enum(["Major", "Minor"])
      .optional()
      .describe('Scale for Push inKey mode ("Major" or "Minor")'),
    scaleRootNote: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe("1-12 scale root note index for Push inKey mode"),
    guitarFrets: z
      .union([
        z.literal(3),
        z.literal(5),
        z.literal(7),
        z.literal(9),
        z.literal(12),
      ])
      .optional()
      .describe("Number of guitar frets to display (3, 5, 7, 9, or 12)"),
    ukuleleFrets: z
      .union([
        z.literal(3),
        z.literal(5),
        z.literal(7),
        z.literal(9),
        z.literal(12),
      ])
      .optional()
      .describe("Number of ukulele frets to display (3, 5, 7, 9, or 12)"),
    octaves: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .optional()
      .describe("Number of piano octaves (1, 2, 3, or 4; default 2)"),
  })
  .optional();

const server = new McpServer({
  name: "gridbeat-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get_chord_shapes",
  {
    description:
      "Query the GridBeat API for deterministic chord shapes across Push, Launchpad, Piano, Guitar, and Ukulele. Accepts one or more shorthand chord symbols (e.g. ['Am', 'F', 'G']) or explicit { root, chord } objects.",
    inputSchema: {
      chords: z
        .union([ChordItemSchema, z.array(ChordItemSchema).min(1)])
        .describe("A single chord or array of chords to look up"),
      instruments: z
        .array(InstrumentEnum)
        .optional()
        .describe(
          "Instruments to return shapes for. Defaults to all 5 instruments.",
        ),
      config: LayoutConfigSchema,
    },
  },
  async ({ chords, instruments, config }) => {
    try {
      const chordList: ChordInput[] = Array.isArray(chords) ? chords : [chords];
      const parsed = chordList.map(parseChordInput);
      const effectiveConfig = resolveEffectiveConfig(
        parsed,
        config as ChordShapeRequestConfig | undefined,
      );

      const responses = await fetchMultipleChordShapes(
        parsed,
        instruments as Instrument[] | undefined,
        effectiveConfig,
      );

      const summaryLines = responses.map((resp, idx) => {
        const instNames = Object.keys(resp.shapes).join(", ");
        return `${idx + 1}. ${resp.root.name} ${resp.chord.name} (${resp.chordNotes.join("-")}) — instruments: ${instNames}`;
      });

      return {
        content: [
          {
            type: "text",
            text: `${summaryLines.join("\n")}\n\n${JSON.stringify(responses, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${message}` }],
      };
    }
  },
);

server.registerTool(
  "generate_chord_sheet_pdf",
  {
    description:
      "Fetch chord shapes from the GridBeat API for a single instrument and generate a space-maximized, print-ready PDF chord sheet. Repeated chords in a progression are automatically deduplicated into unique diagrams with the full progression sequence shown in the header.",
    inputSchema: {
      chords: z
        .array(ChordItemSchema)
        .min(1)
        .describe(
          "Ordered list of chords in the song or progression (e.g. ['C', 'G', 'Am', 'F', 'C', 'G'])",
        ),
      instrument: InstrumentEnum.describe(
        "Single target instrument for the PDF document (Portrait for push/launchpad; Landscape for piano/guitar/ukulele)",
      ),
      title: z
        .string()
        .optional()
        .describe("Optional song or chord sheet title shown in the PDF header"),
      outputPath: z
        .string()
        .optional()
        .describe(
          "Optional destination file path for the PDF. Defaults to a descriptive filename in the current working directory.",
        ),
      config: LayoutConfigSchema,
      theme: z
        .enum(["color", "bw", "dark"])
        .optional()
        .describe(
          'Visual theme: "color" (default, print-friendly white page with GridBeat colors), "bw" (ink-saver grayscale), or "dark" (dark studio UI)',
        ),
      pageSize: z
        .enum(["LETTER", "A4"])
        .optional()
        .describe('Paper size: "LETTER" (default) or "A4"'),
    },
  },
  async ({ chords, instrument, title, outputPath, config, theme, pageSize }) => {
    try {
      const parsedAll = (chords as ChordInput[]).map(parseChordInput);
      const { uniqueChords, progressionLabels } = deduplicateChords(parsedAll);
      const effectiveConfig = resolveEffectiveConfig(
        parsedAll,
        config as ChordShapeRequestConfig | undefined,
      );

      const responses = await fetchMultipleChordShapes(
        uniqueChords,
        [instrument as Instrument],
        effectiveConfig,
      );

      const result = await generateChordSheetPdf({
        instrument: instrument as Instrument,
        chords: responses,
        progressionLabels,
        title,
        outputPath,
        theme: (theme as PdfTheme | undefined) ?? "color",
        pageSize: (pageSize as PageSize | undefined) ?? "LETTER",
        config: effectiveConfig,
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `Generated ${result.instrument} chord sheet PDF: ${result.outputPath}`,
              `Pages: ${result.pageCount} (${result.pageSize} ${result.orientation})`,
              `Unique chords (${result.uniqueChords.length}): ${result.uniqueChords.join(", ")}`,
              `Progression: ${result.progression.join(" -> ")}`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${message}` }],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error in gridbeat-mcp:", err);
  process.exit(1);
});
