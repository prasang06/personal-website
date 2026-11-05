import type { PointSet } from "@/ascii/MorphEngine";
import { hash2 } from "@/ascii/math";
import type { SphereLayout } from "./BlochSphere";
import { PointBuilder } from "./geometry";
import type { StageLabel } from "./stages";

/**
 * A layered network with activations flowing left to right: each connection
 * carries a pulse whose timing depends on its layer, so signal visibly
 * propagates through depth. Neurons brighten as their inputs arrive.
 */

const LAYERS = [4, 7, 7, 5, 3];
const NEURON = 1;
const WIRE = 0;
/** Seconds for activity to sweep input → output. */
const SWEEP = 3.2;

export class NetworkScene {
  readonly out: PointSet;
  private world: Float32Array;
  private kind: Uint8Array;
  /** Layer index (neurons) or gap index + fractional position (wires). */
  private pos: Float32Array;
  private weight: Float32Array;

  constructor(
    private layout: SphereLayout,
    spacing: number,
  ) {
    const { cx, cy, radius } = layout;
    const width = radius * 2.3;
    const height = radius * 1.7;
    const colX = (l: number) => cx - width / 2 + (width * l) / (LAYERS.length - 1);
    const rowY = (l: number, n: number) => cy - height / 2 + (height * (n + 0.5)) / LAYERS[l];

    const b = new PointBuilder(spacing);
    const pos: number[] = [];
    const wts: number[] = [];
    const track = (from: number, p: number, w: number) => {
      while (pos.length < b.count) {
        pos.push(from + p);
        wts.push(w);
      }
    };

    for (let l = 0; l < LAYERS.length - 1; l++) {
      for (let a = 0; a < LAYERS[l]; a++) {
        for (let c = 0; c < LAYERS[l + 1]; c++) {
          const w = hash2(l * 97 + a, c * 13 + 5);
          // Weak connections are drawn sparser so the strong paths stand out.
          const step = spacing * (w > 0.55 ? 1 : 2.2);
          const x0 = colX(l);
          const y0 = rowY(l, a);
          const x1 = colX(l + 1);
          const y1 = rowY(l + 1, c);
          const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
          for (let i = 1; i < n; i++) {
            const t = i / n;
            b.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0, w, WIRE);
            pos.push(l + t);
            wts.push(w);
          }
        }
      }
    }
    LAYERS.forEach((count, l) => {
      for (let n = 0; n < count; n++) {
        b.disc(colX(l), rowY(l, n), spacing * 1.9, 1, NEURON);
        track(l, 0, hash2(l, n + 31));
      }
    });

    const built = b.finish();
    this.world = built.world;
    this.kind = built.kind;
    this.out = built.out;
    this.pos = Float32Array.from(pos);
    this.weight = Float32Array.from(wts);
  }

  project(t: number, animate: boolean) {
    const { xy, lum, accent } = this.out;
    // Activity front position in layer units, looping.
    const front = animate ? ((t % SWEEP) / SWEEP) * (LAYERS.length + 0.6) - 0.3 : 1.6;
    for (let i = 0; i < this.out.count; i++) {
      xy[i * 2] = this.world[i * 3];
      xy[i * 2 + 1] = this.world[i * 3 + 1];
      const d = Math.abs(this.pos[i] - front);
      const pulse = Math.max(0, 1 - d / 0.35);
      if (this.kind[i] === NEURON) {
        lum[i] = 0.55 + 0.45 * pulse;
        accent[i] = 0;
      } else {
        const w = this.weight[i];
        lum[i] = 0.1 + 0.22 * w + 0.6 * pulse * w;
        accent[i] = pulse > 0.8 && w > 0.85 ? 1 : 0;
      }
    }
  }

  labels(): StageLabel[] {
    const { cx, cy, radius } = this.layout;
    return [{ text: LAYERS.join("-") + " MLP / FORWARD PASS", x: cx - radius * 1.15, y: cy + radius * 1.12 }];
  }
}
