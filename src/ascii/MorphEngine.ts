import { clamp } from "./math";
import type { LuminanceField } from "./types";

/** Particles taken from a field: one per lit cell, at the cell centre. */
export interface ParticleSet {
  count: number;
  xy: Float32Array;
  lum: Float32Array;
  accent: Uint8Array;
}

export function particlesFromField(
  field: LuminanceField,
  cellW: number,
  cellH: number,
  threshold = 0.035,
): ParticleSet {
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
 * Moves every source particle to a target point. Targets can move every
 * frame (e.g. a rotating object), so the pairing is by index, fixed once.
 */
export class MorphEngine {
  /** Target index for each source particle. */
  private pair: Uint32Array;
  private delay: Float32Array;
  private scatter: Float32Array;

  constructor(
    private source: ParticleSet,
    /** Target positions at pairing time; later frames may move them. */
    targetXY: Float32Array,
    targetCount: number,
    scatterRadius: number,
  ) {
    const n = source.count;
    this.pair = new Uint32Array(n);
    this.delay = new Float32Array(n);
    this.scatter = new Float32Array(n * 2);

    // Pair by angular rank so the shape sweeps coherently instead of crossing
    // itself; sources outnumber targets, so several share one target.
    const so = angularOrder(source.xy, n);
    const to = angularOrder(targetXY, targetCount);
    for (let r = 0; r < n; r++) {
      this.pair[so[r]] = to[Math.min(targetCount - 1, Math.floor((r * targetCount) / n))];
    }

    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minY = Math.min(minY, source.xy[i * 2 + 1]);
      maxY = Math.max(maxY, source.xy[i * 2 + 1]);
    }
    for (let i = 0; i < n; i++) {
      // The figure fragments from the top down, with jitter.
      const yRank = (source.xy[i * 2 + 1] - minY) / (maxY - minY || 1);
      this.delay[i] = 0.32 * yRank + 0.12 * Math.random();
      const a = Math.random() * Math.PI * 2;
      const r = scatterRadius * (0.3 + 0.7 * Math.random());
      this.scatter[i * 2] = Math.cos(a) * r;
      this.scatter[i * 2 + 1] = Math.sin(a) * r;
    }
  }

  /**
   * Accumulate the morph at progress p (0 = source, 1 = target) into the field.
   * Brightest particle wins in each cell.
   */
  compose(
    p: number,
    target: { xy: Float32Array; lum: Float32Array; accent: Uint8Array },
    field: LuminanceField,
    cellW: number,
    cellH: number,
  ) {
    const { cols, rows, luminance, accent } = field;
    const src = this.source;
    for (let i = 0; i < src.count; i++) {
      const local = clamp((p - this.delay[i]) / 0.56);
      const e = easeInOut(local);
      const j = this.pair[i];
      const arc = Math.sin(Math.PI * e);

      const x =
        src.xy[i * 2] + (target.xy[j * 2] - src.xy[i * 2]) * e + this.scatter[i * 2] * arc;
      const y =
        src.xy[i * 2 + 1] +
        (target.xy[j * 2 + 1] - src.xy[i * 2 + 1]) * e +
        this.scatter[i * 2 + 1] * arc;
      // Dim in flight so the cloud reads as dust rather than a smear.
      const l = (src.lum[i] + (target.lum[j] - src.lum[i]) * e) * (1 - 0.35 * arc);
      if (l <= 0.02) continue;

      const c = Math.floor(x / cellW);
      const r = Math.floor(y / cellH);
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const k = r * cols + c;
      if (l > luminance[k]) {
        luminance[k] = l;
        accent[k] = e < 0.5 ? src.accent[i] : target.accent[j];
      }
    }
  }
}
