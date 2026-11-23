import { describe, expect, it } from "vitest";
import {
  computePageLayouts,
  getOrientationForInstrument,
} from "../pdf/layoutEngine.js";

describe("layoutEngine", () => {
  it("uses portrait for grids and landscape for wide instruments", () => {
    expect(getOrientationForInstrument("push")).toBe("portrait");
    expect(getOrientationForInstrument("launchpad")).toBe("portrait");
    expect(getOrientationForInstrument("piano")).toBe("landscape");
    expect(getOrientationForInstrument("guitar")).toBe("landscape");
    expect(getOrientationForInstrument("ukulele")).toBe("landscape");
  });

  it("maximizes space for 3 push chords on a single portrait page without overlaps", () => {
    const { dimensions, pages } = computePageLayouts(3, "push", "LETTER");
    expect(dimensions.orientation).toBe("portrait");
    expect(pages).toHaveLength(1);
    expect(pages[0].cards).toHaveLength(3);

    for (const card of pages[0].cards) {
      expect(card.x).toBeGreaterThanOrEqual(22);
      expect(card.y).toBeGreaterThanOrEqual(22);
      expect(card.x + card.width).toBeLessThanOrEqual(dimensions.width - 21);
      expect(card.y + card.height).toBeLessThanOrEqual(dimensions.height - 21);
      expect(card.diagramWidth).toBeGreaterThan(150);
      expect(card.diagramHeight).toBeGreaterThan(150);
    }
  });

  it("splits 15 push chords across 2 pages (12 + 3)", () => {
    const { pages } = computePageLayouts(15, "push", "LETTER");
    expect(pages).toHaveLength(2);
    expect(pages[0].cards).toHaveLength(12);
    expect(pages[1].cards).toHaveLength(3);
  });

  it("lays out piano and guitar in landscape", () => {
    const piano = computePageLayouts(4, "piano", "LETTER", { octaves: 2 });
    expect(piano.dimensions.orientation).toBe("landscape");
    expect(piano.pages).toHaveLength(1);
    expect(piano.pages[0].cards).toHaveLength(4);

    const guitar = computePageLayouts(4, "guitar", "A4", { guitarFrets: 5 });
    expect(guitar.dimensions.orientation).toBe("landscape");
    expect(guitar.dimensions.pageSize).toBe("A4");
    expect(guitar.pages).toHaveLength(1);
  });
});
