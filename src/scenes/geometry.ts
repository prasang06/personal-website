import type { PointSet } from "@/ascii/MorphEngine";

/** Accumulates sampled points (x, y, z) with a base weight and a kind tag. */
export class PointBuilder {
  private pts: number[] = [];
  private weights: number[] = [];
  private kinds: number[] = [];

  constructor(private spacing: number) {}

  push(x: number, y: number, z: number, weight: number, kind = 0) {
    this.pts.push(x, y, z);
    this.weights.push(weight);
    this.kinds.push(kind);
  }

  /** Points along a segment, `step` apart (defaults to the grid spacing). */
  line(
    a: [number, number, number],
    b: [number, number, number],
    weight: number,
    kind = 0,
    step = this.spacing,
  ) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, weight, kind);
    }
  }

  /** Axis-aligned rectangle outline in the z = 0 plane. */
  rect(x0: number, y0: number, x1: number, y1: number, weight: number, kind = 0) {
    this.line([x0, y0, 0], [x1, y0, 0], weight, kind);
    this.line([x1, y0, 0], [x1, y1, 0], weight, kind);
    this.line([x1, y1, 0], [x0, y1, 0], weight, kind);
    this.line([x0, y1, 0], [x0, y0, 0], weight, kind);
  }

  /** Filled disc in the z = 0 plane. */
  disc(cx: number, cy: number, r: number, weight: number, kind = 0) {
    this.push(cx, cy, 0, weight, kind);
    const step = this.spacing * 0.8;
    for (let rr = step; rr <= r; rr += step) {
      const n = Math.ceil((2 * Math.PI * rr) / step);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        this.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 0, weight, kind);
      }
    }
  }

  get count() {
    return this.weights.length;
  }

  finish() {
    const count = this.weights.length;
    return {
      world: Float32Array.from(this.pts),
      weight: Float32Array.from(this.weights),
      kind: Uint8Array.from(this.kinds),
      out: {
        count,
        xy: new Float32Array(count * 2),
        lum: new Float32Array(count),
        accent: new Uint8Array(count),
      } satisfies PointSet,
    };
  }
}
