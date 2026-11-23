import { DEFAULT_GRIDBEAT_API_URL } from "../constants.js";
import {
  ChordShapeRequest,
  ChordShapeRequestConfig,
  ChordShapeResponse,
  Instrument,
  ParsedChordQuery,
} from "../types.js";

export function getGridbeatBaseUrl(overrideUrl?: string): string {
  const raw =
    overrideUrl || process.env.GRIDBEAT_API_URL || DEFAULT_GRIDBEAT_API_URL;
  return raw.replace(/\/+$/, "");
}

export async function fetchChordShape(
  request: ChordShapeRequest,
  baseUrl?: string,
): Promise<ChordShapeResponse> {
  const url = `${getGridbeatBaseUrl(baseUrl)}/api/chord-shapes`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to connect to GridBeat API at ${url}: ${message}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      `GridBeat API at ${url} returned non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const errorMsg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`GridBeat API error: ${errorMsg}`);
  }

  return data as ChordShapeResponse;
}

export async function fetchMultipleChordShapes(
  chords: ParsedChordQuery[],
  instruments?: Instrument[],
  config?: ChordShapeRequestConfig,
  baseUrl?: string,
): Promise<ChordShapeResponse[]> {
  return Promise.all(
    chords.map((c) =>
      fetchChordShape(
        {
          root: c.root,
          chord: c.chord,
          instruments,
          config,
        },
        baseUrl,
      ),
    ),
  );
}
