import type { PointSet } from "@/ascii/MorphEngine";
import { hash2 } from "@/ascii/math";
import type { SphereLayout } from "./BlochSphere";

/**
 * The quiet ending: everything has come apart into sparse characters that
 * drift slowly upward and fade, like the session powering down.
 */

const COUNT = 700;

export class DustScene {
  readonly out: PointSet;

  constructor(private layout: SphereLayout) {
    this.out = {
      count: COUNT,
      xy: new Float32Array(COUNT * 2),
      lum: new Float32Array(COUNT),
      accent: new Uint8Array(COUNT),
    };
  }

  project(t: number, animate: boolean) {
    const { cx, cy, radius: R } = this.layout;
    const w = R * 3.4;
    const h = R * 2.8;
    const { xy, lum } = this.out;
    for (let i = 0; i < COUNT; i++) {
      const speed = 6 + 14 * hash2(i, 3);
      const rise = animate ? t * speed : 0;
      const fy = (hash2(i, 7) * h - rise) % h;
      const y = fy < 0 ? fy + h : fy;
      const sway = animate ? Math.sin(t * 0.4 + i) * 6 : 0;
      xy[i * 2] = cx - w / 2 + hash2(i, 11) * w + sway;
      xy[i * 2 + 1] = cy - h / 2 + y;
      // Fade toward the top and bottom of the field.
      const edge = Math.sin((y / h) * Math.PI);
      const twinkle = animate ? 0.75 + 0.25 * Math.sin(t * 2 + i * 1.7) : 1;
      lum[i] = (0.08 + 0.3 * hash2(i, 13)) * edge * twinkle;
    }
  }
}
