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
 *
 * An Interstellar nod: the Endurance, a spinning ring of twelve modules,
 * orbits on a slightly inclined path, slipping behind the shadow and back.
 */

const DISK = 0;
const LENSED = 1;
const PHOTON = 2;
const CRAFT = 3;
const BEACON = 4;

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

/** Endurance: orbit radius, angular speed (rad/s), ring radius, and modules. */
const ORBIT = 1.08;
const ORBIT_SPEED = 0.22;
const CRAFT_RING = 0.17;
const MODULES = 12;

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

    // Endurance in its own frame: `r` is the distance from the hub and `phi`
    // the angle on the ring, both in units of R. Modules are short arcs on the
    // ring, joined to the hub by four spokes.
    const step = spacing / R;
    for (let m = 0; m < MODULES; m++) {
      const centre = (m / MODULES) * 2 * Math.PI;
      for (let d = -0.16; d <= 0.16; d += step / CRAFT_RING) {
        add(CRAFT_RING, centre + d, CRAFT, 0.9);
        add(CRAFT_RING * 1.22, centre + d, CRAFT, 0.75);
      }
    }
    for (let k = 0; k < 4; k++)
      for (let r = step; r < CRAFT_RING; r += step) add(r, (k / 4) * 2 * Math.PI + Math.PI / 12, CRAFT, 0.55);
    add(0, 0, CRAFT, 1);
    add(CRAFT_RING * 1.22, Math.PI / 2, BEACON, 1);

    const built = b.finish();
    this.kind = built.kind;
    this.out = built.out;
    this.r = Float32Array.from(rs);
    this.phi0 = Float32Array.from(phis);
    this.bright = Float32Array.from(brights);
  }

  /**
   * Endurance's hub in disk coordinates, how near it is (1 front, -1 back)
   * and whether the black hole's shadow currently hides it.
   */
  private craft(time: number) {
    const th = 2.4 + ORBIT_SPEED * time;
    const x = ORBIT * Math.cos(th);
    // A little more open than the disk, and lifted above it, so it reads clearly.
    const y = ORBIT * Math.sin(th) * FLATTEN * 1.7 - 0.12;
    const near = Math.sin(th);
    const hidden = near < 0 && Math.hypot(x, y) < SHADOW * 1.25;
    return { x, y, near, hidden };
  }

  private toScreen(x: number, y: number): [number, number] {
    const { cx, cy, radius: R } = this.layout;
    return [cx + R * (x * Math.cos(ROLL) - y * Math.sin(ROLL)), cy + R * (x * Math.sin(ROLL) + y * Math.cos(ROLL))];
  }

  project(t: number, animate: boolean) {
    const { cx, cy, radius: R } = this.layout;
    const { xy, lum, accent } = this.out;
    const cr = Math.cos(ROLL);
    const sr = Math.sin(ROLL);
    const time = animate ? t : 0;
    const ship = this.craft(time);
    // Nearer means slightly larger; the ring spins about its hub.
    const shipScale = 1 + 0.25 * ship.near;
    const spin = time * 0.7;
    const beaconOn = !animate || Math.floor(t * 1.5) % 2 === 0;

    for (let i = 0; i < this.out.count; i++) {
      const r = this.r[i];
      const k = this.kind[i];
      let x: number;
      let y: number;
      let l: number;
      let a = 0;

      if (k === CRAFT || k === BEACON) {
        const a2 = this.phi0[i] + spin;
        // Seen from slightly above: the ring is foreshortened vertically.
        x = ship.x + r * Math.cos(a2) * shipScale;
        y = ship.y + r * Math.sin(a2) * 0.65 * shipScale;
        l = ship.hidden ? 0 : this.bright[i] * (0.75 + 0.25 * ship.near);
        if (k === BEACON) {
          l = ship.hidden || !beaconOn ? 0 : 1;
          a = 1;
        }
      } else if (k === PHOTON) {
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

  labels(t: number, animate: boolean): StageLabel[] {
    const { cx, cy, radius: R } = this.layout;
    const ship = this.craft(animate ? t : 0);
    const out: StageLabel[] = [
      { text: "SCHWARZSCHILD / r_s", x: cx - R * 1.2, y: cy + R * 0.95, lum: 0.5 },
      { text: "dtau = dt * sqrt(1 - r_s/r)", x: cx - R * 1.2, y: cy + R * 0.95 + 18, lum: 0.75 },
      { text: "1 hour here = 7 years on earth", x: cx - R * 1.2, y: cy + R * 0.95 + 36, lum: 0.45 },
    ];
    if (!ship.hidden) {
      const [sx, sy] = this.toScreen(ship.x + CRAFT_RING * 1.4, ship.y);
      out.push({ text: "ENDURANCE", x: sx, y: sy, lum: 0.4 + 0.25 * ship.near });
    }
    return out;
  }
}
