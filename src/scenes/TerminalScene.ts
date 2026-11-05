import type { PointSet } from "@/ascii/MorphEngine";
import type { GridSpec } from "@/ascii/types";
import type { SphereLayout } from "./BlochSphere";
import { PointBuilder } from "./geometry";
import type { StageLabel } from "./stages";

/**
 * Engineering: a workstation monitor whose screen types out a short session,
 * from the GitHub profile card to a local agent run with a live progress bar.
 */

const SCRIPT = [
  "prasang@archlinux ~",
  "$ whoami",
  "quantum computing & ai research engineer",
  "$ cat research.txt",
  "quantum algorithms, qml, scientific ml",
  '$ agent run "survey: neural quantum states"',
  "  plan -> research -> review -> report",
  "", // progress bar, filled in live
  "$ ",
];
/** Typed characters per second, and the loop length in seconds. */
const TYPE_RATE = 26;
const LOOP = 18;

export class TerminalScene {
  readonly out: PointSet;
  private world: Float32Array;
  private weight: Float32Array;
  private screen = { x0: 0, y0: 0 };

  constructor(
    layout: SphereLayout,
    private grid: GridSpec,
  ) {
    const { cx, cy, radius: R } = layout;
    const { cellW, cellH } = grid;
    const longest = Math.max(...SCRIPT.map((l) => l.length), 40);
    const w = Math.max(R * 2.3, (longest + 6) * cellW);
    const h = (SCRIPT.length + 3) * cellH;
    const x0 = cx - w / 2;
    const y0 = cy - h / 2 - R * 0.12;
    const inset = cellW * 1.2;
    this.screen = { x0: x0 + inset, y0: y0 + inset };

    const b = new PointBuilder(cellW * 0.9);
    b.rect(x0, y0, x0 + w, y0 + h, 0.6);
    b.rect(x0 + inset, y0 + inset, x0 + w - inset, y0 + h - inset * 1.6, 0.26);
    // Window controls in the bezel.
    for (let i = 0; i < 3; i++) b.push(x0 + inset * (1.6 + i * 1.4), y0 + inset * 0.55, 0, 0.5);
    // Stand.
    const base = y0 + h;
    b.line([cx - R * 0.08, base, 0], [cx - R * 0.14, base + R * 0.22, 0], 0.45);
    b.line([cx + R * 0.08, base, 0], [cx + R * 0.14, base + R * 0.22, 0], 0.45);
    b.line([cx - R * 0.45, base + R * 0.24, 0], [cx + R * 0.45, base + R * 0.24, 0], 0.5);
    // Faint screen glow so the morph has somewhere to land inside the frame.
    for (let y = y0 + inset * 2; y < y0 + h - inset * 2; y += cellH * 2)
      for (let x = x0 + inset * 2; x < x0 + w - inset * 2; x += cellW * 6) b.push(x, y, 0, 0.06);

    const built = b.finish();
    this.world = built.world;
    this.weight = built.weight;
    this.out = built.out;
  }

  project() {
    const { xy, lum, accent } = this.out;
    for (let i = 0; i < this.out.count; i++) {
      xy[i * 2] = this.world[i * 3];
      xy[i * 2 + 1] = this.world[i * 3 + 1];
      lum[i] = this.weight[i];
      accent[i] = 0;
    }
  }

  labels(t: number, animate: boolean): StageLabel[] {
    const { cellW, cellH } = this.grid;
    const time = animate ? t % LOOP : LOOP;
    let budget = Math.floor(time * TYPE_RATE);

    const pct = animate ? Math.min(100, Math.floor(((t % LOOP) / LOOP) * 140)) : 100;
    const filled = Math.round(pct / 5);
    const rate = animate ? 118 + Math.round(14 * Math.sin(t * 1.3)) : 128;
    const bar = `  [${"#".repeat(filled)}${"-".repeat(20 - filled)}] ${String(pct).padStart(3)}%  ${rate} tok/s`;
    const cursor = !animate || Math.floor(t * 2) % 2 === 0 ? "_" : " ";

    const out: StageLabel[] = [];
    SCRIPT.forEach((line, i) => {
      let text = i === 7 ? bar : line;
      if (i === SCRIPT.length - 1) text += cursor;
      // Typed lines appear progressively; the bar and prompt appear whole.
      if (i !== 7 && i !== SCRIPT.length - 1) {
        if (budget <= 0) return;
        text = text.slice(0, budget);
        budget -= line.length;
      } else if (budget <= 0) return;
      out.push({
        text,
        x: this.screen.x0 - cellW,
        y: this.screen.y0 + cellH * (i + 1.4),
        lum: line.startsWith("$") || line.startsWith("prasang") ? 0.9 : 0.6,
        accent: i === 7 && pct >= 100,
      });
    });
    return out;
  }
}
