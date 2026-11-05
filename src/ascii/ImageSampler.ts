import { createField, type ASCIIScene, type GridSpec } from "./types";
import { clamp, hash2 } from "./math";

export interface ImageSceneOptions {
  /** Where the image sits on screen, in pixels. */
  placement: (width: number, height: number, aspect: number) => {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** Treat dark pixels as bright (for dark-subject-on-light photos). */
  invert?: boolean;
  contrast?: number;
  gamma?: number;
  /**
   * Image was produced by scripts/prepare_portrait.py: R holds graded
   * luminance and G a rim-light mask used for accent characters.
   */
  packed?: boolean;
}

/**
 * Photographic mode: samples a bitmap into per-cell luminance.
 */
export class ImageScene implements ASCIIScene {
  constructor(
    private image: CanvasImageSource & { width: number; height: number },
    private options: ImageSceneOptions,
  ) {}

  static load(src: string, options: ImageSceneOptions): Promise<ImageScene> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(new ImageScene(img, options));
      img.onerror = reject;
      img.src = src;
    });
  }

  build(grid: GridSpec) {
    const { cols, rows, width, height } = grid;
    const field = createField(cols, rows);
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return field;

    // Draw the image at grid resolution; the browser's downscale averages
    // each cell's pixels for us.
    const p = this.options.placement(width, height, this.image.width / this.image.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      this.image,
      p.x / grid.cellW,
      p.y / grid.cellH,
      p.w / grid.cellW,
      p.h / grid.cellH,
    );
    const { data } = ctx.getImageData(0, 0, cols, rows);
    const { packed, invert } = this.options;
    const contrast = this.options.contrast ?? (packed ? 1 : 1.2);
    const gamma = this.options.gamma ?? 1;

    for (let i = 0; i < cols * rows; i++) {
      const o = i * 4;
      const a = data[o + 3] / 255;
      let l = packed
        ? data[o] / 255
        : (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
      if (invert) l = 1 - l;
      l = clamp((l * a - 0.5) * contrast + 0.5);

      if (packed) {
        const rim = (data[o + 1] / 255) * a;
        l = Math.max(l, rim * 0.95);
        const c = i % cols;
        const r = (i / cols) | 0;
        if (rim > 0.45 && hash2(c, r) < 0.08) field.accent[i] = 1;
      }
      field.luminance[i] = Math.pow(l, gamma);
    }
    return field;
  }
}
