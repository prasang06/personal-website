import type { PointSet } from "@/ascii/MorphEngine";
import type { SphereLayout } from "./BlochSphere";
import { PointBuilder } from "./geometry";
import type { StageLabel } from "./stages";

/**
 * Computational physics: a rotating cubic lattice carrying a travelling
 * Klein–Gordon-style wave. Nodes bob with the field; brighter means larger
 * amplitude, so the crest reads as a band of light moving through the grid.
 */

const N = 5;
const NODE = 1;
const EDGE = 0;
const ELEVATION = 0.42;

export class LatticeScene {
  readonly out: PointSet;
  private world: Float32Array;
  private kind: Uint8Array;

  constructor(
    private layout: SphereLayout,
    spacing: number,
  ) {
    // Unit lattice in [-1, 1]^3, scaled to pixels at projection time.
    const b = new PointBuilder(spacing / layout.radius);
    const at = (i: number) => -1 + (2 * i) / (N - 1);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        for (let k = 0; k < N; k++) {
          const p: [number, number, number] = [at(i), at(j), at(k)];
          // Nodes are small clusters so they read as particles riding the wave.
          for (const [dx, dz] of [[0, 0], [0.035, 0], [-0.035, 0], [0, 0.05], [0, -0.05]])
            b.push(p[0] + dx, p[1], p[2] + dz, 1, NODE);
          if (i < N - 1) b.line(p, [at(i + 1), p[1], p[2]], 1, EDGE);
          if (j < N - 1) b.line(p, [p[0], at(j + 1), p[2]], 1, EDGE);
          if (k < N - 1) b.line(p, [p[0], p[1], at(k + 1)], 1, EDGE);
        }
    const built = b.finish();
    this.world = built.world;
    this.kind = built.kind;
    this.out = built.out;
  }

  project(t: number, animate: boolean) {
    const { cx, cy, radius } = this.layout;
    const R = radius * 0.78;
    const az = animate ? 0.5 + t * 0.12 : 0.5;
    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const ce = Math.cos(ELEVATION);
    const se = Math.sin(ELEVATION);
    const phase = animate ? t * 1.6 : 0;
    const { xy, lum, accent } = this.out;

    for (let i = 0; i < this.out.count; i++) {
      const x = this.world[i * 3];
      const y = this.world[i * 3 + 1];
      let z = this.world[i * 3 + 2];
      // Travelling wave along the lattice diagonal, displacing nodes vertically.
      const u = Math.sin(2.4 * (x + 0.6 * y) - phase);
      z += 0.26 * u;

      const x1 = x * ca - y * sa;
      const y1 = x * sa + y * ca;
      const depth = y1 * ce - z * se;
      const zs = y1 * se + z * ce;
      const s = 1 / (1 + depth * 0.18);
      xy[i * 2] = cx + R * x1 * s;
      xy[i * 2 + 1] = cy - R * zs * s;

      const front = 0.5 - 0.5 * depth;
      const crest = 0.5 + 0.5 * u;
      lum[i] =
        this.kind[i] === NODE
          ? (0.5 + 0.5 * crest) * (0.6 + 0.4 * front)
          : (0.06 + 0.16 * crest) * (0.5 + 0.5 * front);
      accent[i] = this.kind[i] === NODE && u > 0.97 && front > 0.6 ? 1 : 0;
    }
  }

  labels(): StageLabel[] {
    const { cx, cy, radius } = this.layout;
    return [{ text: "KLEIN-GORDON FIELD / 5X5X5", x: cx - radius * 0.9, y: cy + radius * 1.2 }];
  }
}
