import { glyphIndex } from "@/ascii/ASCIIRenderer";
import { MorphEngine, rasterize } from "@/ascii/MorphEngine";
import { createField, type ASCIIScene, type GridSpec, type LuminanceField } from "@/ascii/types";
import type { Stage, StageLabel } from "./stages";

/**
 * Scroll positions (px) for a stage: it starts forming at `start` and is
 * fully formed at `at`. The first stage is held from the top of the page.
 */
export interface StageStop {
  start: number;
  at: number;
}

/** Fraction of a morph over which labels fade in (at the end) or out (at the start). */
const LABEL_FADE = 0.15;

/**
 * The page's canvas story: a chain of stages (portrait, Bloch sphere, QPU,
 * ...) where scroll position decides which stage is held or which pair is
 * mid-morph.
 */
export class StoryScene implements ASCIIScene {
  private stops: StageStop[];
  private scroll = 0;
  private drawnScroll = -1;
  private grid: GridSpec | null = null;
  private field: LuminanceField | null = null;
  /** morphs[i] carries stage i into stage i + 1. */
  private morphs: (MorphEngine | null)[] = [];

  constructor(
    private stages: Stage[],
    private reducedMotion = false,
  ) {
    this.stops = stages.map(() => ({ start: 0, at: 0 }));
  }

  setStops(stops: StageStop[]) {
    this.stops = stops;
    this.drawnScroll = -1;
  }

  setScroll(y: number) {
    this.scroll = y;
  }

  build(grid: GridSpec) {
    this.grid = grid;
    this.stages.forEach((s) => s.build(grid));
    const scatter = Math.min(grid.width, grid.height) * 0.1;
    // Pair each neighbouring stage once, from representative frames.
    this.morphs = this.stages.slice(1).map((next, i) =>
      new MorphEngine(this.stages[i].frame(0, false), next.frame(0, false), scatter),
    );

    const field = createField(grid.cols, grid.rows);
    field.glyph = new Int16Array(grid.cols * grid.rows).fill(-1);
    this.field = field;
    this.drawnScroll = -1;
    this.compose(0);
    return field;
  }

  /** Which stage is held, or which morph is in progress, at the current scroll. */
  private locate(): { from: number; to: number; p: number } {
    const y = this.scroll;
    for (let i = this.stages.length - 1; i > 0; i--) {
      const { start, at } = this.stops[i];
      if (y >= at) return { from: i, to: i, p: 1 };
      if (y > start) {
        let p = (y - start) / (at - start || 1);
        if (this.reducedMotion) p = p > 0.5 ? 1 : 0;
        return p >= 1 ? { from: i, to: i, p: 1 } : p <= 0 ? { from: i - 1, to: i - 1, p: 1 } : { from: i - 1, to: i, p };
      }
    }
    return { from: 0, to: 0, p: 1 };
  }

  update(t: number) {
    const { from, to } = this.locate();
    const changed = this.scroll !== this.drawnScroll;
    const live =
      !this.reducedMotion && (from !== to || this.stages[from].animated || this.stages[to].animated);
    if (changed || live) this.compose(t);
    return changed || live;
  }

  private compose(t: number) {
    const { field, grid } = this;
    if (!field || !grid) return;
    this.drawnScroll = this.scroll;
    const animate = !this.reducedMotion;
    const { from, to, p } = this.locate();

    field.glyph!.fill(-1);
    const held = from === to ? this.stages[from] : null;
    const exact = held?.field?.();
    if (exact) {
      field.luminance.set(exact.luminance);
      field.accent.set(exact.accent);
      return;
    }

    field.luminance.fill(0);
    field.accent.fill(0);
    if (held) {
      rasterize(held.frame(t, animate), field, grid.cellW, grid.cellH);
      this.drawLabels(held.labels?.(t, animate) ?? [], 1);
      return;
    }

    const a = this.stages[from];
    const b = this.stages[to];
    this.morphs[from]?.compose(p, a.frame(t, animate), b.frame(t, animate), field, grid.cellW, grid.cellH);
    this.drawLabels(a.labels?.(t, animate) ?? [], Math.max(0, 1 - p / LABEL_FADE));
    this.drawLabels(b.labels?.(t, animate) ?? [], Math.max(0, (p - (1 - LABEL_FADE)) / LABEL_FADE));
  }

  /** Pin label text just right of each anchor point. */
  private drawLabels(labels: StageLabel[], alpha: number) {
    const { field, grid } = this;
    if (!field || !grid || alpha <= 0) return;
    for (const { text, x, y, lum: base = 0.75, accent = false } of labels) {
      const lum = base * alpha;
      const r = Math.floor(y / grid.cellH);
      const c0 = Math.floor(x / grid.cellW) + 2;
      if (r < 0 || r >= grid.rows) continue;
      Array.from(text).forEach((ch, k) => {
        const c = c0 + k;
        if (c < 0 || c >= grid.cols) return;
        const i = r * grid.cols + c;
        // Spaces clear the cell so the label reads cleanly over the scene.
        field.glyph![i] = glyphIndex(ch);
        field.luminance[i] = ch === " " ? 0 : lum;
        field.accent[i] = accent ? 1 : 0;
      });
    }
  }
}
