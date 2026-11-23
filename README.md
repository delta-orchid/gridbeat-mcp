# gridbeat-mcp

Model Context Protocol (MCP) server that queries the [GridBeat Chord Shapes API](https://github.com/leouofa/gridbeat/blob/main/API.md) and generates space-maximized, print-ready vector PDF chord sheets.

## Features

- **All 5 GridBeat Instruments**: `push`, `launchpad`, `piano`, `guitar`, and `ukulele`.
- **Flexible Chord Parsing**: Accepts shorthand symbols (`"C"`, `"Am"`, `"F#m"`, `"Bb7"`, `"Emaj7"`, `"Dsus4"`, `"G5"`) or explicit `{ root, chord }` objects (including custom interval arrays).
- **Consistent Push `inKey` Mode**: Automatically locks `scaleRootNote` and `scale` to the first chord in a progression when using `pushMode: "inKey"`, keeping pad layouts uniform across a song.
- **Space-Maximized Vector PDFs**:
  - Single instrument per PDF document.
  - **Portrait** orientation for square grids (`push`, `launchpad`) and **Landscape** for wide instruments (`piano`, `guitar`, `ukulele`).
  - Automatically computes the optimal `(columns × rows)` layout per page to maximize diagram size.
  - Deduplicates repeated chords into unique diagrams while showing the full progression order in the header.
  - Supports `"color"` (default print-friendly), `"bw"` (ink-saver grayscale), and `"dark"` themes, plus `LETTER` and `A4` paper sizes.

## Tools

### `get_chord_shapes`
Queries GridBeat for one or more chords and returns structured chord notes and active positions.

### `generate_chord_sheet_pdf`
Fetches chord shapes for a single instrument and writes a shareable, print-optimized PDF to disk.

## Configuration

By default, requests are sent to `https://www.gridbeat.wiki/api/chord-shapes`. Set `GRIDBEAT_API_URL` to point to a local or custom GridBeat instance (e.g., `http://localhost:3000`).

## Development

```bash
npm install
npm run build
npm test
```

## MCP Client Configuration

```json
{
  "mcpServers": {
    "gridbeat": {
      "command": "node",
      "args": ["/path/to/gridbeat-mcp/dist/index.js"],
      "env": {
        "GRIDBEAT_API_URL": "https://www.gridbeat.wiki"
      }
    }
  }
}
```
