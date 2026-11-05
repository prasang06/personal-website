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
 */
export interface LuminanceField {
  cols: number;
  rows: number;
  luminance: Float32Array;
  accent: Uint8Array;
}

export interface ASCIIScene {
  build(grid: GridSpec): LuminanceField;
}

export function createField(cols: number, rows: number): LuminanceField {
  return {
    cols,
    rows,
    luminance: new Float32Array(cols * rows),
    accent: new Uint8Array(cols * rows),
  };
}
