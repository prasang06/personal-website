import {
  GLITCH,
  LABEL_CHARS,
  LEVELS,
  RAMP,
  accentAt,
  levelOf,
  purpleAt,
  rampIndexOf,
} from "./CharacterMapper";
import { hash2, smoothstep } from "./math";
import type { ASCIIScene, GridSpec, LuminanceField } from "./types";

export interface RendererOptions {
  /** Font family used for glyphs; should be a loaded monospace face. */
  fontFamily: string;
  /** Columns at full quality for a given viewport width. */
  columnsFor?: (width: number) => number;
  reducedMotion?: boolean;
}

const GLYPHS = Array.from(new Set((RAMP + GLITCH + LABEL_CHARS).replace(" ", "")));
const GLYPH_INDEX = new Map(GLYPHS.map((g, i) => [g, i]));
const RAMP_GLYPH = Array.from(RAMP, (ch) => (ch === " " ? -1 : GLYPH_INDEX.get(ch)!));
const GLITCH_GLYPH = Array.from(GLITCH, (ch) => GLYPH_INDEX.get(ch)!);

/** Atlas index for a character, or -1 if it isn't in the atlas. */
export const glyphIndex = (ch: string) => GLYPH_INDEX.get(ch) ?? -1;

// Cell height relative to width; monospace advance is ~0.6em.
const CELL_ASPECT = 1 / 0.6;
// Cell size multipliers for dynamic resolution, from best to cheapest.
const QUALITY_STEPS = [1, 1.15, 1.3, 1.5, 1.75];
const LENS_RADIUS = 160;
const REVEAL_SCRAMBLE = 0.45;
const IDLE_FRAME_MS = 1000 / 24;
// Fraction of cells that start flickering per second.
const FLICKER_RATE = 0.012;

const defaultColumns = (w: number) => (w >= 1280 ? 210 : w >= 1024 ? 180 : w >= 768 ? 140 : 96);

/**
 * Canvas 2D character renderer. Scenes provide per-cell luminance; the
 * renderer handles glyph atlas caching, the intro decode, flicker, pointer
 * lens and adaptive resolution.
 */
export class ASCIIRenderer {
  private ctx: CanvasRenderingContext2D;
  private atlas: HTMLCanvasElement | null = null;
  private atlasCell = { w: 0, h: 0 };
  private grid: GridSpec | null = null;
  private field: LuminanceField | null = null;
  private scene: ASCIIScene | null = null;

  private ambient = new Float32Array(0);
  private revealDelay = new Float32Array(0);
  private glitchUntil = new Float32Array(0);
  private glitchGlyph = new Uint8Array(0);

  private dpr = 1;
  private quality = 0;
  private frameCosts: number[] = [];
  private raf = 0;
  private running = false;
  private visible = true;
  private startTime = 0;
  private lastDraw = 0;
  private revealEnd = 0;
  private lastT = 0;
  private flickerDebt = 0;

  private pointer = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, strength: 0, active: false };
  private lastPointerMove = 0;

  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private options: RendererOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;

    this.resizeObserver = new ResizeObserver(() => this.rebuild());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.kick();
    });
    this.intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.addEventListener("pointerleave", this.onPointerLeave);
  }

  setScene(scene: ASCIIScene) {
    this.scene = scene;
    this.startTime = performance.now();
    this.rebuild(true);
  }

  start() {
    this.running = true;
    this.kick();
  }

  /** Request a redraw, e.g. after external state such as scroll progress changed. */
  invalidate() {
    this.lastDraw = 0;
    this.kick();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerleave", this.onPointerLeave);
  }

  private onVisibility = () => {
    if (document.visibilityState === "visible") this.kick();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.tx = e.clientX - rect.left;
    this.pointer.ty = e.clientY - rect.top;
    if (!this.pointer.active) {
      this.pointer.x = this.pointer.tx;
      this.pointer.y = this.pointer.ty;
    }
    this.pointer.active = true;
    this.lastPointerMove = performance.now();
    this.kick();
  };

  private onPointerLeave = () => {
    this.pointer.active = false;
    this.kick();
  };

  private kick() {
    if (!this.running || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Recompute grid, atlas and scene field for the current size/quality. */
  private rebuild(resetReveal = false) {
    if (!this.scene) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    const columns = (this.options.columnsFor ?? defaultColumns)(width);
    const cellW = (width / columns) * QUALITY_STEPS[this.quality];
    const cellH = cellW * CELL_ASPECT;
    const cols = Math.ceil(width / cellW);
    const rows = Math.ceil(height / cellH);
    this.grid = { cols, rows, cellW, cellH, width, height };
    // Exposed for debugging adaptive resolution in devtools.
    this.canvas.dataset.quality = String(this.quality);
    this.canvas.dataset.rebuilds = String(Number(this.canvas.dataset.rebuilds ?? 0) + 1);

    this.buildAtlas(cellW, cellH);
    this.field = this.scene.build(this.grid);

    const n = cols * rows;
    this.ambient = new Float32Array(n);
    this.glitchUntil = new Float32Array(n);
    this.glitchGlyph = new Uint8Array(n);
    const needDelays = resetReveal || this.revealDelay.length !== n;
    if (needDelays) this.revealDelay = new Float32Array(n);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const h = hash2(c * 7 + 3, r * 13 + 1);
        // Sparse dust in the empty background.
        if (h < 0.045) this.ambient[i] = 0.07 + h * 1.6;
        if (needDelays) {
          // Decode top-down with jitter, figure-first.
          const lum = this.field.luminance[i];
          this.revealDelay[i] =
            0.15 + (r / rows) * 0.9 + hash2(c, r + 991) * 0.55 + (lum > 0.05 ? 0 : 0.35);
        }
      }
    }
    if (needDelays) this.revealEnd = 2.4;

    // Already-revealed content after a resize shouldn't replay the intro.
    if (!resetReveal && this.elapsed() > this.revealEnd) this.revealDelay.fill(0);
    if (this.options.reducedMotion) this.revealDelay.fill(-1e3);

    this.lastDraw = 0;
    this.kick();
  }

  private buildAtlas(cellW: number, cellH: number) {
    const w = Math.ceil(cellW * this.dpr);
    const h = Math.ceil(cellH * this.dpr);
    const atlas = document.createElement("canvas");
    atlas.width = w * GLYPHS.length;
    atlas.height = h * LEVELS * 2;
    const a = atlas.getContext("2d");
    if (!a) return;

    const fontSize = cellH * 0.86 * this.dpr;
    a.font = `500 ${fontSize}px ${this.options.fontFamily}`;
    a.textAlign = "center";
    a.textBaseline = "middle";
    for (let level = 0; level < LEVELS; level++) {
      const t = (level + 0.5) / LEVELS;
      const colors = [purpleAt(t), accentAt(t)];
      colors.forEach((color, set) => {
        a.fillStyle = color;
        const y = (set * LEVELS + level) * h + h / 2;
        GLYPHS.forEach((g, gi) => a.fillText(g, gi * w + w / 2, y));
      });
    }
    this.atlas = atlas;
    this.atlasCell = { w, h };
  }

  private elapsed() {
    return (performance.now() - this.startTime) / 1000;
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (!this.running || !this.visible || document.visibilityState !== "visible") return;

    const t = this.elapsed();
    const reduced = !!this.options.reducedMotion;
    const sceneAnimating = this.scene?.update?.(t) ?? false;
    const animating =
      sceneAnimating ||
      (!reduced &&
        (t < this.revealEnd + 0.5 || now - this.lastPointerMove < 1200 || this.pointer.strength > 0.01));

    // Idle: flicker only needs a low frame rate. Reduced motion: draw once.
    const due = this.lastDraw === 0 || (!reduced && (animating || now - this.lastDraw >= IDLE_FRAME_MS));
    if (due) {
      const t0 = performance.now();
      this.draw(t);
      this.lastDraw = now;
      if (animating) this.trackCost(performance.now() - t0);
    }
    if (!reduced || sceneAnimating) this.raf = requestAnimationFrame(this.frame);
  };

  private trackCost(ms: number) {
    this.frameCosts.push(ms);
    if (this.frameCosts.length < 45) return;
    const avg = this.frameCosts.reduce((s, v) => s + v, 0) / this.frameCosts.length;
    this.frameCosts = [];
    if (avg > 11 && this.quality < QUALITY_STEPS.length - 1) {
      this.quality++;
      this.rebuild();
    }
  }

  private draw(t: number) {
    const { grid, field, atlas } = this;
    if (!grid || !field || !atlas) return;
    const { cols, rows, cellW, cellH } = grid;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const { w: aw, h: ah } = this.atlasCell;
    const reduced = !!this.options.reducedMotion;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Ease the lens toward the pointer.
    const p = this.pointer;
    p.x += (p.tx - p.x) * 0.18;
    p.y += (p.ty - p.y) * 0.18;
    p.strength += ((p.active && !reduced ? 1 : 0) - p.strength) * 0.08;

    // Spawn flickering cells at a fixed rate, independent of frame rate.
    const n = cols * rows;
    const dt = Math.min(0.1, Math.max(0, t - this.lastT));
    this.lastT = t;
    if (!reduced) {
      this.flickerDebt += n * FLICKER_RATE * dt;
      const spawns = Math.floor(this.flickerDebt);
      this.flickerDebt -= spawns;
      for (let k = 0; k < spawns; k++) {
        const i = (Math.random() * n) | 0;
        this.glitchUntil[i] = t + 0.06 + Math.random() * 0.22;
        this.glitchGlyph[i] = (Math.random() * GLITCH_GLYPH.length) | 0;
      }
    }

    const lensOn = p.strength > 0.01;
    const R = LENS_RADIUS;
    const frameSeed = Math.floor(t * 30);

    for (let r = 0; r < rows; r++) {
      const py = (r + 0.5) * cellH;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const reveal = t - this.revealDelay[i];
        if (reveal < 0) continue;

        const px = (c + 0.5) * cellW;
        let si = i;
        let boost = 0;
        if (lensOn) {
          const dx = p.x - px;
          const dy = p.y - py;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const f = smoothstep(R, 0, d) * p.strength;
            // Magnify: sample from closer to the pointer.
            const sc = Math.min(cols - 1, Math.max(0, Math.floor((px + dx * 0.4 * f) / cellW)));
            const sr = Math.min(rows - 1, Math.max(0, Math.floor((py + dy * 0.4 * f) / cellH)));
            si = sr * cols + sc;
            boost = f;
          }
        }

        let lum = field.luminance[si];
        if (lum < 0.04) lum = Math.max(lum, this.ambient[i]);
        lum += boost * (lum > 0.04 ? 0.16 : 0.1);

        // -1: settled ramp glyph; otherwise an index into GLITCH_GLYPH.
        let scramble = -1;
        if (reveal < REVEAL_SCRAMBLE) {
          lum *= 0.35 + 0.65 * (reveal / REVEAL_SCRAMBLE);
          scramble = (hash2(i, frameSeed) * GLITCH_GLYPH.length) | 0;
        } else if (this.glitchUntil[i] > t || (boost > 0.2 && hash2(i, frameSeed) < boost * 0.02)) {
          scramble = this.glitchGlyph[i];
        }

        const level = levelOf(lum);
        const pinned = field.glyph ? field.glyph[si] : -1;
        const glyph =
          pinned >= 0
            ? pinned
            : scramble >= 0 && level >= 2
              ? GLITCH_GLYPH[scramble]
              : RAMP_GLYPH[rampIndexOf(level)];
        if (glyph < 0) continue;

        const set = field.accent[si] ? 1 : 0;
        ctx.drawImage(
          atlas,
          glyph * aw,
          (set * LEVELS + level) * ah,
          aw,
          ah,
          Math.round(c * cellW * dpr),
          Math.round(r * cellH * dpr),
          aw,
          ah,
        );
      }
    }
  }
}
