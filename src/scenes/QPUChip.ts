import type { PointSet } from "@/ascii/MorphEngine";
import type { SphereLayout } from "./BlochSphere";
import type { StageLabel } from "./stages";

/**
 * A superconducting processor in the heavy-hex layout IBM uses: rows of
 * qubits joined by bridge qubits every fourth column, alternating offsets.
 * Drawn on a tilted, slowly swaying chip with readout lines to edge pads,
 * and a gate pulse (accent) travelling through the couplers.
 */

const COLS = 9;
const ROWS = 4;
/** Bridge columns for the gap below each row, alternating like heavy-hex. */
const BRIDGES = [
  [0, 4, 8],
  [2, 6],
  [0, 4, 8],
];
const TILT = 0.72;
/** Resting rotation of the chip in its plane; it sways slightly around this. */
const YAW = -0.05;
/** Seconds for the gate pulse to traverse its path. */
const PULSE_PERIOD = 9;

enum Kind {
  Node,
  NodeCore,
  Coupler,
  Border,
  Readout,
}

const WEIGHT: Record<Kind, number> = {
  [Kind.Node]: 0.7,
  [Kind.NodeCore]: 0.95,
  [Kind.Coupler]: 0.58,
  [Kind.Border]: 0.28,
  [Kind.Readout]: 0.24,
};

export class QPUChip {
  readonly out: PointSet;
  readonly qubits: number;
  private plane: Float32Array;
  private kind: Uint8Array;
  private path: [number, number][];
  private pathLen: number[];
  private halfW: number;
  private halfH: number;
  private d: number;

  constructor(
    private layout: SphereLayout,
    spacing: number,
  ) {
    const pts: number[] = [];
    const kinds: number[] = [];
    const push = (x: number, y: number, k: Kind) => {
      pts.push(x, y);
      kinds.push(k);
    };
    const line = (x0: number, y0: number, x1: number, y1: number, k: Kind, step = spacing) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
      for (let i = 0; i <= n; i++) push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, k);
    };

    const halfW = layout.radius * 1.12;
    const d = (2 * halfW * 0.84) / (COLS - 1);
    const halfH = (ROWS - 1) * d + d * 1.3;
    this.halfW = halfW;
    this.halfH = halfH;
    this.d = d;
    const rn = d * 0.3;

    const node = (c: number, yRow: number): [number, number] => [(c - (COLS - 1) / 2) * d, yRow];
    const rowY = (r: number) => (r - (ROWS - 1) / 2) * 2 * d;

    // Qubits: discs with a bright core.
    const qubits: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) qubits.push(node(c, rowY(r)));
    BRIDGES.forEach((cols, g) => cols.forEach((c) => qubits.push(node(c, rowY(g) + d))));
    this.qubits = qubits.length;
    for (const [x, y] of qubits) {
      push(x, y, Kind.NodeCore);
      for (let rr = spacing * 0.8; rr <= rn; rr += spacing * 0.8) {
        const n = Math.ceil((2 * Math.PI * rr) / (spacing * 0.8));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 2 * Math.PI;
          push(x + rr * Math.cos(a), y + rr * Math.sin(a), rr < rn * 0.5 ? Kind.NodeCore : Kind.Node);
        }
      }
    }

    // Couplers along rows and through bridges, stopping at the disc edges.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const [x0, y] = node(c, rowY(r));
        line(x0 + rn, y, x0 + d - rn, y, Kind.Coupler, spacing * 0.6);
      }
    }
    BRIDGES.forEach((cols, g) =>
      cols.forEach((c) => {
        const [x] = node(c, 0);
        line(x, rowY(g) + rn, x, rowY(g) + d - rn, Kind.Coupler, spacing * 0.6);
        line(x, rowY(g) + d + rn, x, rowY(g + 1) - rn, Kind.Coupler, spacing * 0.6);
      }),
    );

    // Readout lines meander from the outer rows to pads at the chip edge.
    for (const [r, dir] of [
      [0, -1],
      [ROWS - 1, 1],
    ] as const) {
      for (let c = 0; c < COLS; c += 2) {
        const [x, y] = node(c, rowY(r));
        const y0 = y + dir * rn;
        const y1 = dir * (halfH - d * 0.35);
        const n = Math.ceil(Math.abs(y1 - y0) / (spacing * 0.6));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          push(x + Math.sin(t * Math.PI * 6) * d * 0.14, y0 + (y1 - y0) * t, Kind.Readout);
        }
        line(x - d * 0.16, y1, x + d * 0.16, y1, Kind.Readout);
      }
    }

    // Chip outline.
    line(-halfW, -halfH, halfW, -halfH, Kind.Border);
    line(halfW, -halfH, halfW, halfH, Kind.Border);
    line(halfW, halfH, -halfW, halfH, Kind.Border);
    line(-halfW, halfH, -halfW, -halfH, Kind.Border);

    this.plane = Float32Array.from(pts);
    this.kind = Uint8Array.from(kinds);
    const count = kinds.length;
    this.out = {
      count,
      xy: new Float32Array(count * 2),
      lum: new Float32Array(count),
      accent: new Uint8Array(count),
    };

    // Pulse path: a closed loop that snakes down through every row and
    // climbs back along the left side, using only bridges that exist in each
    // gap, so it circulates without jumping.
    const p = (c: number, r: number) => node(c, rowY(r));
    const bridge = (c: number, gap: number): [number, number] => [p(c, 0)[0], rowY(gap) + d];
    this.path = [
      p(0, 0), p(8, 0), bridge(8, 0), p(8, 1),
      p(2, 1), bridge(2, 1), p(2, 2),
      p(8, 2), bridge(8, 2), p(8, 3),
      p(0, 3), bridge(0, 2), p(0, 2),
      p(2, 2), bridge(2, 1), p(2, 1),
      p(0, 1), bridge(0, 0), p(0, 0),
    ];
    this.pathLen = [0];
    for (let i = 1; i < this.path.length; i++) {
      const [ax, ay] = this.path[i - 1];
      const [bx, by] = this.path[i];
      this.pathLen.push(this.pathLen[i - 1] + Math.hypot(bx - ax, by - ay));
    }
  }

  private pulseAt(t: number): [number, number] {
    const total = this.pathLen[this.pathLen.length - 1];
    const s = ((t % PULSE_PERIOD) / PULSE_PERIOD) * total;
    let i = 1;
    while (i < this.pathLen.length - 1 && this.pathLen[i] < s) i++;
    const f = (s - this.pathLen[i - 1]) / (this.pathLen[i] - this.pathLen[i - 1] || 1);
    const [ax, ay] = this.path[i - 1];
    const [bx, by] = this.path[i];
    return [ax + (bx - ax) * f, ay + (by - ay) * f];
  }

  /** Map a chip-plane point to the screen; returns depth in [-1, 1] (1 = nearest). */
  private toScreen(x: number, y: number, yaw: number, out: Float32Array, i: number) {
    const { cx, cy } = this.layout;
    const xr = x * Math.cos(yaw) - y * Math.sin(yaw);
    const yr = x * Math.sin(yaw) + y * Math.cos(yaw);
    const depth = Math.max(-1, Math.min(1, yr / this.halfH));
    const s = 1 + 0.12 * depth;
    out[i * 2] = cx + xr * s;
    out[i * 2 + 1] = cy + yr * Math.cos(TILT) * s;
    return depth;
  }

  project(t: number, animate: boolean) {
    const yaw = animate ? YAW + 0.06 * Math.sin(t * 0.25) : YAW;
    const [px, py] = animate ? this.pulseAt(t) : [Infinity, Infinity];
    const reach = this.d * 0.42;
    const { xy, lum, accent } = this.out;

    for (let i = 0; i < this.out.count; i++) {
      const x = this.plane[i * 2];
      const y = this.plane[i * 2 + 1];
      const depth = this.toScreen(x, y, yaw, xy, i);
      let l = WEIGHT[this.kind[i] as Kind] * (0.78 + 0.22 * depth);
      let a = 0;
      const dist = Math.hypot(x - px, y - py);
      if (dist < reach && this.kind[i] !== Kind.Border && this.kind[i] !== Kind.Readout) {
        l = Math.max(l, 1 - (dist / reach) * 0.3);
        a = dist < reach * 0.7 ? 1 : 0;
      }
      lum[i] = l;
      accent[i] = a;
    }
  }

  labels(): StageLabel[] {
    const tmp = new Float32Array(2);
    this.toScreen(-this.halfW, this.halfH + this.d * 0.9, YAW, tmp, 0);
    return [{ text: `HEAVY-HEX ${this.qubits}Q`, x: tmp[0], y: tmp[1] }];
  }
}
