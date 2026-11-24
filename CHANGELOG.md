# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-23

### Added
- **Model Context Protocol (MCP) Server**: Stdio MCP interface providing LLMs and IDEs (Claude Desktop, Cursor, Antigravity) with native music theory and chord visualization capabilities.
- **`get_chord_shapes` Tool**: Query GridBeat's chord engine with single or batch chord inputs, returning raw pad coordinates, fret markers, and key mappings.
- **`generate_chord_sheet_pdf` Tool**: Generate high-resolution, vector-based chord cheat sheets saved directly to disk.
- **Multi-Instrument Visualization**:
  - **Ableton Push**: 8×8 grid with chromatic and in-key modes, plus 4ths, 3rds, and sequent harmonic layouts.
  - **Novation Launchpad**: 8×8 grid supporting customizable row step widths (2, 3, 4, 5, and 8).
  - **Piano**: 1 to 4 octave keyboards with rendered key markers, root note emphasis, and chord interval mapping.
  - **Guitar & Ukulele**: Parametric fretboards (3, 5, 7, 9, 12 frets) with fret markers, nut rendering, and open/muted string indicators.
- **Space-Maximizing Layout Engine**: Solves optimal `(columns × rows)` grid configurations per page to maximize diagram display area.
- **Dynamic Orientation**: Automatically chooses Portrait orientation for square controller matrices (Push, Launchpad) and Landscape orientation for wide linear instruments (Piano, Guitar, Ukulele).
- **Chord Progression Deduplication**: Displays progression sequence in page headers while rendering each unique chord diagram only once to conserve space.
- **Push In-Key Continuity**: Preserves scale and root note context derived from the initial chord across the entire progression.
- **Color Themes & Page Formats**: Built-in support for `color` (vibrant default), `bw` (monochrome print-saver), and `dark` themes on Letter and A4 page sizes.
- **Comprehensive Test Suite**: Full Vitest test coverage across chord parsing, mathematical layout solver, and vector PDF rendering.
