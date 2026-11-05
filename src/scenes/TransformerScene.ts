import type { PointSet } from "@/ascii/MorphEngine";
import type { GridSpec } from "@/ascii/types";
import type { SphereLayout } from "./BlochSphere";
import { PointBuilder } from "./geometry";
import type { StageLabel } from "./stages";

/**
 * A transformer block as a schematic: embedding → multi-head attention →
 * add & norm → feed-forward → add & norm, with the residual stream on the
 * left. The attention box holds a live causal attention map whose focus
 * drifts over time; the current query row's peak carries the accent.
 */

const OUTLINE = 0;
const HEAT = 1;
const ARROW = 2;
const RESIDUAL = 3;
const T = 8;

interface Box {
  label: string;
  y0: number;
  y1: number;
}

export class TransformerScene {
  readonly out: PointSet;
  private world: Float32Array;
  private kind: Uint8Array;
  /** Attention cell (row * T + col) for heat points, else -1. */
  private cell: Int16Array;
  private boxes: Box[] = [];
  private heat = { x0: 0, y0: 0, size: 0 };
  private x0: number;

  constructor(
    private layout: SphereLayout,
    private grid: GridSpec,
  ) {
    const { cx, cy, radius: R } = layout;
    const spacing = grid.cellW * 0.9;
    const w = R * 1.7;
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    this.x0 = x0;

    // Heights in units of R, listed bottom to top.
    const spec: [string, number][] = [
      ["EMBEDDING", 0.22],
      ["MULTI-HEAD ATTENTION", 0.92],
      ["ADD & NORM", 0.18],
      ["FEED FORWARD", 0.32],
      ["ADD & NORM", 0.18],
    ];
    const gap = 0.14;
    const total = spec.reduce((s, [, h]) => s + h, 0) + gap * (spec.length - 1);
    let y = cy + (total * R) / 2;

    const b = new PointBuilder(spacing);
    const cells: number[] = [];
    const mark = (cellIndex: number) => {
      while (cells.length < b.count) cells.push(cellIndex);
    };

    spec.forEach(([label, h], i) => {
      const y1 = y;
      const y0 = y - h * R;
      b.rect(x0, y0, x1, y1, 1, OUTLINE);
      mark(-1);
      this.boxes.push({ label, y0, y1 });
      if (i < spec.length - 1) {
        // Arrow up into the next box.
        b.line([cx, y0, 0], [cx, y0 - gap * R, 0], 0.4, ARROW);
        b.line([cx - spacing * 1.5, y0 - gap * R + spacing * 1.5, 0], [cx, y0 - gap * R, 0], 0.4, ARROW);
        b.line([cx + spacing * 1.5, y0 - gap * R + spacing * 1.5, 0], [cx, y0 - gap * R, 0], 0.4, ARROW);
        mark(-1);
      }
      y = y0 - gap * R;
    });

    // Residual stream: bypasses attention and FFN into each add & norm.
    const rx = x0 - R * 0.2;
    const [embed, attn, norm1, ffn, norm2] = this.boxes;
    for (const [from, to] of [
      [embed, norm1],
      [norm1, norm2],
    ] as const) {
      const ya = (from.y0 + from.y1) / 2;
      const yb = (to.y0 + to.y1) / 2;
      b.line([x0, ya, 0], [rx, ya, 0], 0.32, RESIDUAL);
      b.line([rx, ya, 0], [rx, yb, 0], 0.32, RESIDUAL);
      b.line([rx, yb, 0], [x0, yb, 0], 0.32, RESIDUAL);
    }
    mark(-1);
    void ffn;

    // Attention map, right-aligned in the attention box below its title.
    const size = Math.min(w * 0.5, (attn.y1 - attn.y0) * 0.78);
    const hx = x1 - size - R * 0.1;
    const hy = attn.y1 - size - (attn.y1 - attn.y0 - size) / 2;
    this.heat = { x0: hx, y0: hy, size };
    const cs = size / T;
    for (let r = 0; r < T; r++)
      for (let c = 0; c < T; c++) {
        for (let py = cs * 0.2; py < cs * 0.8; py += spacing * 0.7)
          for (let px = cs * 0.2; px < cs * 0.8; px += spacing * 0.7) b.push(hx + c * cs + px, hy + r * cs + py, 0, 1, HEAT);
        mark(r * T + c);
      }

    const built = b.finish();
    this.world = built.world;
    this.kind = built.kind;
    this.out = built.out;
    this.cell = Int16Array.from(cells);
  }

  project(t: number, animate: boolean) {
    const { xy, lum, accent } = this.out;
    const time = animate ? t : 0;

    // Causal attention with a drifting preference for recent tokens.
    const attn = new Float32Array(T * T);
    const peak = new Int16Array(T);
    for (let r = 0; r < T; r++) {
      let sum = 0;
      let best = 0;
      for (let c = 0; c <= r; c++) {
        const v = Math.exp(2.2 * Math.cos(0.9 * (r - c) - time * 0.7 + r * 0.4));
        attn[r * T + c] = v;
        sum += v;
        if (v > attn[r * T + best]) best = c;
      }
      for (let c = 0; c <= r; c++) attn[r * T + c] /= sum;
      peak[r] = best;
    }
    const query = Math.floor(time * 1.2) % T;

    for (let i = 0; i < this.out.count; i++) {
      xy[i * 2] = this.world[i * 3];
      xy[i * 2 + 1] = this.world[i * 3 + 1];
      const k = this.kind[i];
      accent[i] = 0;
      if (k === HEAT) {
        const cell = this.cell[i];
        const r = Math.floor(cell / T);
        const c = cell % T;
        const masked = c > r;
        lum[i] = masked ? 0.05 : 0.12 + 0.85 * Math.min(1, attn[cell] * 1.8);
        if (r === query && c === peak[r]) {
          lum[i] = 1;
          accent[i] = 1;
        }
      } else {
        lum[i] = k === OUTLINE ? 0.3 : k === ARROW ? 0.4 : 0.26;
      }
    }
  }

  labels(): StageLabel[] {
    const { cellW, cellH } = this.grid;
    const out: StageLabel[] = this.boxes.map((bx) => ({
      text: bx.label,
      x: this.x0 + cellW * 0.5,
      y: bx.label === "MULTI-HEAD ATTENTION" ? bx.y0 + cellH * 1.2 : (bx.y0 + bx.y1) / 2,
    }));
    const attn = this.boxes[1];
    out.push({ text: "Q K V", x: this.x0 + cellW * 0.5, y: attn.y1 - cellH * 1.4, lum: 0.45 });
    out.push({ text: "TRANSFORMER BLOCK", x: this.x0 - cellW * 2, y: this.boxes[4].y0 - cellH * 1.6, lum: 0.45 });
    return out;
  }
}
