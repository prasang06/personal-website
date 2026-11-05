import type { PointSet } from "@/ascii/MorphEngine";
import { hash2 } from "@/ascii/math";
import type { SphereLayout } from "./BlochSphere";
import { PointBuilder } from "./geometry";
import type { StageLabel } from "./stages";

/**
 * A Schwarzschild black hole in the familiar lensed look: a dark shadow
 * ringed by the photon sphere, a diagonal accretion disk crossing in front,
 * and the far side of the disk lensed into a thick bright arc over the
 * shadow (and a thinner one beneath). Material orbits with Keplerian speed,
 * so the inner disk laps the outer; the approaching side is Doppler-boosted.
 * The hot core glows in the accent colour and cools to purple outward.
 */

const DISK = 0;
const LENSED = 1;
const PHOTON = 2;

/** Radii in units of the layout radius. */
const SHADOW = 0.34;
const INNER = 0.5;
const OUTER = 1.75;
/** Only the inner disk is bright enough to show in the lensed image. */
const LENSED_OUTER = 1.2;
/** Apparent flattening of the disk (cos of the inclination). */
const FLATTEN = 0.26;
/** On-screen tilt: the disk rises to the right. */
const ROLL = -0.36;
/** Angular speed at the inner edge (rad/s); falls off as r^-1.5. */
const OMEGA_IN = 0.9;
/** Inside this radius the disk is hot enough to glow in the accent colour. */
const HOT = INNER + 0.42;

export class BlackHoleScene {
  readonly out: PointSet;
  private r: Float32Array;
  private phi0: Float32Array;
  private kind: Uint8Array;
  private bright: Float32Array;

  constructor(
    private layout: SphereLayout,
    spacing: number,
  ) {
    const R = layout.radius;
    const b = new PointBuilder(spacing);
    const rs: number[] = [];
    const phis: number[] = [];
    const brights: number[] = [];
    const add = (r: number, phi: number, kind: number, bright: number) => {
      b.push(0, 0, 0, 1, kind);
      rs.push(r);
      phis.push(phi);
      brights.push(bright);
    };

    const dr = (spacing * 1.3) / R;
    for (let r = INNER; r <= OUTER; r += dr) {
      // Sparser toward the edge, where the disk thins into wisps.
      const step = spacing * (1.15 + 0.9 * (r - INNER));
      const n = Math.ceil((2 * Math.PI * r * R) / step);
      const heat = Math.pow(1 - (r - INNER) / (OUTER - INNER), 1.8);
      for (let i = 0; i < n; i++) {
        const seed = Math.round(r * 1000);
        const phi = (i / n) * 2 * Math.PI + hash2(i, seed) * 0.25;
        // Turbulent streaks: brightness varies along each ring.
        const grain = 0.6 + 0.4 * hash2(i * 7, seed);
        add(r, phi, DISK, (0.18 + 0.82 * heat) * grain);
        if (r < LENSED_OUTER) add(r, phi, LENSED, (0.3 + 0.7 * heat) * grain);
      }
    }
    const pn = Math.ceil((2 * Math.PI * SHADOW * 1.06 * R) / (spacing * 0.6));
    for (let i = 0; i < pn; i++) add(SHADOW * 1.06, (i / pn) * 2 * Math.PI, PHOTON, 1);

    const built = b.finish();
    this.kind = built.kind;
    this.out = built.out;
    this.r = Float32Array.from(rs);
    this.phi0 = Float32Array.from(phis);
    this.bright = Float32Array.from(brights);
  }

  project(t: number, animate: boolean) {
    const { cx, cy, radius: R } = this.layout;
    const { xy, lum, accent } = this.out;
    const cr = Math.cos(ROLL);
    const sr = Math.sin(ROLL);
    const time = animate ? t : 0;

    for (let i = 0; i < this.out.count; i++) {
      const r = this.r[i];
      const k = this.kind[i];
      let x: number;
      let y: number;
      let l: number;
      let a = 0;

      if (k === PHOTON) {
        const phi = this.phi0[i];
        x = r * Math.cos(phi);
        y = r * Math.sin(phi);
        // Brighter along the top, where the lensed arc piles up.
        l = 0.7 + 0.3 * Math.max(0, -Math.sin(phi));
        a = 1;
      } else {
        const phi = this.phi0[i] + OMEGA_IN * Math.pow(INNER / r, 1.5) * time;
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        // Approaching side (left) boosted, receding side dimmed.
        const doppler = 1 - 0.45 * c;
        if (k === DISK) {
          x = r * c;
          y = r * s * FLATTEN;
          // The far half disappears behind the shadow.
          const hidden = s < 0 && Math.hypot(x, y) < SHADOW * 1.1;
          l = hidden ? 0 : Math.min(1, this.bright[i] * doppler);
          a = r < HOT && l > 0.45 ? 1 : 0;
        } else {
          // Lensed image: a thick, bright arc over the shadow (s < 0 maps to
          // the top) and a thin, dimmer one beneath, fading at the sides.
          const top = s < 0;
          const spread = top ? 0.5 : 0.16;
          const rho = SHADOW * 1.12 + (r - INNER) * spread;
          x = rho * c;
          y = rho * s * (top ? 1 : 0.9);
          l = Math.min(1, this.bright[i] * doppler * (top ? 1 : 0.5) * (0.25 + 0.75 * Math.abs(s)));
          a = l > 0.4 && r < HOT ? 1 : 0;
        }
      }

      xy[i * 2] = cx + R * (x * cr - y * sr);
      xy[i * 2 + 1] = cy + R * (x * sr + y * cr);
      lum[i] = l;
      accent[i] = a;
    }
  }

  labels(): StageLabel[] {
    const { cx, cy, radius: R } = this.layout;
    return [
      { text: "SCHWARZSCHILD / r_s", x: cx - R * 1.2, y: cy + R * 0.95, lum: 0.5 },
      { text: "dtau = dt * sqrt(1 - r_s/r)", x: cx - R * 1.2, y: cy + R * 0.95 + 18, lum: 0.75 },
    ];
  }
}
