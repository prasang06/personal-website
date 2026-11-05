/** Pixel geometry of the character grid the renderer draws into. */
export interface GridSpec {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  width: number;
  height: number;
}

/**
 * A scene sampled onto the grid. `luminance` is 0..1 per cell (row-major);
 * `accent` flags cells that should use the accent palette instead of purple.
 * `glyph` optionally pins a cell to a specific character (atlas index, -1 = none),
 * used for labels.
 */
export interface LuminanceField {
  cols: number;
  rows: number;
  luminance: Float32Array;
  accent: Uint8Array;
  glyph?: Int16Array;
}

export interface ASCIIScene {
  /** Sample the scene onto a grid. Called on mount, resize and quality changes. */
  build(grid: GridSpec): LuminanceField;
  /**
   * Optional per-frame update of the field returned by `build`, in place.
   * Returns true while the scene is changing and needs full-rate redraws.
   */
  update?(t: number): boolean;
}

export function createField(cols: number, rows: number): LuminanceField {
  return {
    cols,
    rows,
    luminance: new Float32Array(cols * rows),
    accent: new Uint8Array(cols * rows),
  };
}
