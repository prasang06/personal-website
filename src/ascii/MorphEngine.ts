import { clamp, hash2 } from "./math";
import type { LuminanceField } from "./types";

/** A drawable point cloud in screen pixels. */
export interface PointSet {
  count: number;
  xy: Float32Array;
  lum: Float32Array;
  accent: Uint8Array;
}

/** Particles taken from a field: one per lit cell, at the cell centre. */
export function particlesFromField(
  field: LuminanceField,
  cellW: number,
  cellH: number,
  threshold = 0.035,
): PointSet {
  const idx: number[] = [];
  for (let i = 0; i < field.luminance.length; i++) {
    if (field.luminance[i] > threshold) idx.push(i);
  }
  const count = idx.length;
  const xy = new Float32Array(count * 2);
  const lum = new Float32Array(count);
  const accent = new Uint8Array(count);
  idx.forEach((i, k) => {
    xy[k * 2] = ((i % field.cols) + 0.5) * cellW;
    xy[k * 2 + 1] = (Math.floor(i / field.cols) + 0.5) * cellH;
    lum[k] = field.luminance[i];
    accent[k] = field.accent[i];
  });
  return { count, xy, lum, accent };
}

/** Accumulate points into a field; the brightest point wins each cell. */
export function rasterize(pts: PointSet, field: LuminanceField, cellW: number, cellH: number) {
  const { cols, rows, luminance, accent } = field;
  for (let i = 0; i < pts.count; i++) {
    const l = pts.lum[i];
    if (l <= 0.02) continue;
    const c = Math.floor(pts.xy[i * 2] / cellW);
    const r = Math.floor(pts.xy[i * 2 + 1] / cellH);
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    const k = r * cols + c;
    if (l > luminance[k]) {
      luminance[k] = l;
      accent[k] = pts.accent[i];
    }
  }
}

/** Sort indices of a point set by polar angle around its centroid. */
function angularOrder(xy: Float32Array, count: number): Uint32Array {
  let mx = 0;
  let my = 0;
  for (let i = 0; i < count; i++) {
    mx += xy[i * 2];
    my += xy[i * 2 + 1];
  }
  mx /= count || 1;
  my /= count || 1;
  const angle = new Float32Array(count);
  for (let i = 0; i < count; i++) angle[i] = Math.atan2(xy[i * 2 + 1] - my, xy[i * 2] - mx);
  const order = new Uint32Array(count).map((_, i) => i);
  return order.sort((a, b) => angle[a] - angle[b]);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Carries one point cloud into another. Both ends may move every frame
 * (rotating objects), so particles pair source and target by index, fixed
 * once. There are as many particles as the larger cloud, so every source
 * point leaves and every target point arrives.
 */
export class MorphEngine {
  private count: number;
  private src: Uint32Array;
  private dst: Uint32Array;
  private delay: Float32Array;
  private scatter: Float32Array;

  constructor(source: PointSet, target: PointSet, scatterRadius: number) {
    const ns = source.count;
    const nt = target.count;
    const n = Math.max(ns, nt);
    this.count = n;
    this.src = new Uint32Array(n);
    this.dst = new Uint32Array(n);
    this.delay = new Float32Array(n);
    this.scatter = new Float32Array(n * 2);
    if (!ns || !nt) {
      this.count = 0;
      return;
    }

    // Pair by angular rank so the shape sweeps coherently instead of crossing itself.
    const so = angularOrder(source.xy, ns);
    const to = angularOrder(target.xy, nt);
    for (let k = 0; k < n; k++) {
      this.src[k] = so[Math.floor((k * ns) / n)];
      this.dst[k] = to[Math.floor((k * nt) / n)];
    }

    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < ns; i++) {
      minY = Math.min(minY, source.xy[i * 2 + 1]);
      maxY = Math.max(maxY, source.xy[i * 2 + 1]);
    }
    for (let k = 0; k < n; k++) {
      // The source breaks up from the top down, with jitter.
      const yRank = (source.xy[this.src[k] * 2 + 1] - minY) / (maxY - minY || 1);
      // Seeded, so a rebuild (resize, quality change) reproduces the same paths.
      this.delay[k] = 0.32 * yRank + 0.12 * hash2(k, 11);
      const a = hash2(k, 23) * Math.PI * 2;
      const r = scatterRadius * (0.3 + 0.7 * hash2(k, 37));
      this.scatter[k * 2] = Math.cos(a) * r;
      this.scatter[k * 2 + 1] = Math.sin(a) * r;
    }
  }

  /** Accumulate the morph at progress p (0 = source, 1 = target) into the field. */
  compose(
    p: number,
    source: PointSet,
    target: PointSet,
    field: LuminanceField,
    cellW: number,
    cellH: number,
  ) {
    const { cols, rows, luminance, accent } = field;
    for (let k = 0; k < this.count; k++) {
      const e = easeInOut(clamp((p - this.delay[k]) / 0.56));
      const i = this.src[k];
      const j = this.dst[k];
      const arc = Math.sin(Math.PI * e);

      const sx = source.xy[i * 2];
      const sy = source.xy[i * 2 + 1];
      const x = sx + (target.xy[j * 2] - sx) * e + this.scatter[k * 2] * arc;
      const y = sy + (target.xy[j * 2 + 1] - sy) * e + this.scatter[k * 2 + 1] * arc;
      // Dim in flight so the cloud reads as dust rather than a smear.
      const l = (source.lum[i] + (target.lum[j] - source.lum[i]) * e) * (1 - 0.35 * arc);
      if (l <= 0.02) continue;

      const c = Math.floor(x / cellW);
      const r = Math.floor(y / cellH);
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const cell = r * cols + c;
      if (l > luminance[cell]) {
        luminance[cell] = l;
        accent[cell] = e < 0.5 ? source.accent[i] : target.accent[j];
      }
    }
  }
}
