/**
 * Bloch sphere as a point cloud: a lit surface stipple, latitude/longitude
 * circles, axes and a precessing state vector. Points live in world space
 * (z up, |0⟩ at +z) and are projected each frame with a slow rotation.
 */

export interface SphereLayout {
  cx: number;
  cy: number;
  /** Radius in pixels. */
  radius: number;
}

export function sphereLayout(width: number, height: number): SphereLayout {
  if (width < 768) {
    return { cx: width * 0.5, cy: height * 0.3, radius: Math.min(width * 0.36, height * 0.2) };
  }
  return { cx: width * 0.66, cy: height * 0.5, radius: Math.min(height * 0.33, width * 0.24) };
}

enum Kind {
  Surface,
  Line,
  Axis,
  /** Screen-space silhouette; unaffected by rotation. */
  Outline,
}

/** Points along the state vector, regenerated per frame. */
const VECTOR_POINTS = 48;
const ELEVATION = 0.38;
// Light direction in view space (x right, y away from viewer, z up).
const LIGHT = normalize(-0.55, -0.6, 0.6);

function normalize(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

export interface ProjectedPoints {
  count: number;
  /** Screen x, y per point. */
  xy: Float32Array;
  lum: Float32Array;
  accent: Uint8Array;
}

export class BlochSphere {
  private world: Float32Array;
  private weight: Float32Array;
  private kind: Uint8Array;
  private staticCount: number;
  readonly out: ProjectedPoints;

  constructor(
    readonly layout: SphereLayout,
    /** Approximate pixel spacing between sampled points. */
    spacing: number,
  ) {
    const pts: number[] = [];
    const w: number[] = [];
    const k: number[] = [];
    const push = (x: number, y: number, z: number, weight: number, kind: Kind) => {
      pts.push(x, y, z);
      w.push(weight);
      k.push(kind);
    };

    const R = layout.radius;
    const circleN = Math.max(48, Math.ceil((2 * Math.PI * R) / spacing));

    // Surface stipple on a Fibonacci lattice, so the sphere reads as a volume.
    const surfaceN = Math.round(circleN * 4.5);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < surfaceN; i++) {
      const z = 1 - (2 * (i + 0.5)) / surfaceN;
      const r = Math.sqrt(1 - z * z);
      const a = i * golden;
      push(r * Math.cos(a), r * Math.sin(a), z, 1, Kind.Surface);
    }

    // Equator, two latitudes, four meridians.
    for (const [z, weight] of [
      [0, 0.62],
      [0.5, 0.36],
      [-0.5, 0.36],
    ] as const) {
      const r = Math.sqrt(1 - z * z);
      const n = Math.ceil(circleN * r);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        push(r * Math.cos(a), r * Math.sin(a), z, weight, Kind.Line);
      }
    }
    for (let m = 0; m < 4; m++) {
      const phi = (m / 4) * Math.PI;
      for (let i = 0; i < circleN; i++) {
        const a = (i / circleN) * 2 * Math.PI;
        push(Math.cos(phi) * Math.sin(a), Math.sin(phi) * Math.sin(a), Math.cos(a), 0.34, Kind.Line);
      }
    }

    // Silhouette circle. World coords hold the screen angle in x.
    const outlineN = Math.ceil(circleN * 1.2);
    for (let i = 0; i < outlineN; i++) push((i / outlineN) * 2 * Math.PI, 0, 0, 0.55, Kind.Outline);

    // Axes, dashed inside the sphere.
    const axisN = Math.ceil((2.7 * R) / spacing);
    for (let axis = 0; axis < 3; axis++) {
      for (let i = 0; i <= axisN; i++) {
        const s = -1.35 + (2.7 * i) / axisN;
        if (Math.abs(s) < 1 && i % 2) continue;
        const v = [0, 0, 0];
        v[axis] = s;
        push(v[0], v[1], v[2], axis === 2 ? 0.6 : 0.46, Kind.Axis);
      }
    }

    this.staticCount = pts.length / 3;
    const total = this.staticCount + VECTOR_POINTS;
    this.world = Float32Array.from(pts);
    this.weight = Float32Array.from(w);
    this.kind = Uint8Array.from(k);
    this.out = {
      count: total,
      xy: new Float32Array(total * 2),
      lum: new Float32Array(total),
      accent: new Uint8Array(total),
    };
  }

  /** Screen positions of the |0⟩ and |1⟩ poles for labels. */
  poles(): { top: [number, number]; bottom: [number, number] } {
    const { cx, cy, radius } = this.layout;
    const dz = Math.cos(ELEVATION) * 1.2 * radius;
    return { top: [cx, cy - dz], bottom: [cx, cy + dz] };
  }

  /** Project all points for time t (seconds). */
  project(t: number, animate: boolean) {
    const { cx, cy, radius: R } = this.layout;
    const az = animate ? t * 0.22 : 0.6;
    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const ce = Math.cos(ELEVATION);
    const se = Math.sin(ELEVATION);
    const { xy, lum, accent } = this.out;

    const projectOne = (i: number, x: number, y: number, z: number, base: number, kind: Kind) => {
      if (kind === Kind.Outline) {
        xy[i * 2] = cx + R * Math.cos(x);
        xy[i * 2 + 1] = cy - R * Math.sin(x);
        lum[i] = base;
        accent[i] = 0;
        return;
      }
      const x1 = x * ca - y * sa;
      const y1 = x * sa + y * ca;
      // Tilt so we look slightly down onto the sphere; depth < 0 faces the viewer.
      const depth = y1 * ce - z * se;
      const zs = y1 * se + z * ce;
      xy[i * 2] = cx + R * x1;
      xy[i * 2 + 1] = cy - R * zs;

      const front = 0.5 - 0.5 * depth;
      if (kind === Kind.Surface) {
        // Lambert shade; the far hemisphere is hidden behind the near one.
        const shade = Math.max(0, x1 * LIGHT[0] + depth * LIGHT[1] + zs * LIGHT[2]);
        lum[i] = depth < 0 ? 0.07 + 0.3 * shade : 0;
      } else {
        lum[i] = base * (0.32 + 0.68 * front);
      }
      accent[i] = 0;
    };

    for (let i = 0; i < this.staticCount; i++) {
      projectOne(
        i,
        this.world[i * 3],
        this.world[i * 3 + 1],
        this.world[i * 3 + 2],
        this.weight[i],
        this.kind[i] as Kind,
      );
    }

    // State vector precessing about z, with a gently nodding polar angle.
    const theta = animate ? 0.95 + 0.3 * Math.sin(t * 0.5) : 0.95;
    const phi = animate ? t * 0.8 : 0.9;
    const vx = Math.sin(theta) * Math.cos(phi);
    const vy = Math.sin(theta) * Math.sin(phi);
    const vz = Math.cos(theta);
    for (let j = 0; j < VECTOR_POINTS; j++) {
      const s = (j + 1) / VECTOR_POINTS;
      const i = this.staticCount + j;
      projectOne(i, vx * s, vy * s, vz * s, 0.92, Kind.Line);
      lum[i] = Math.max(lum[i], 0.8);
      // The tip carries the accent colour.
      if (j >= VECTOR_POINTS - 3) {
        lum[i] = 1;
        accent[i] = 1;
      }
    }
  }
}
