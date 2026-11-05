import { glyphIndex } from "@/ascii/ASCIIRenderer";
import { MorphEngine, particlesFromField, type ParticleSet } from "@/ascii/MorphEngine";
import { createField, type ASCIIScene, type GridSpec, type LuminanceField } from "@/ascii/types";
import { BlochSphere, sphereLayout } from "./BlochSphere";

/**
 * Scroll-driven scene: the portrait (progress 0) fragments into particles
 * that reassemble as the Bloch sphere (progress 1).
 */
export class ChapterScene implements ASCIIScene {
  private progress = 0;
  private drawnProgress = -1;
  private grid: GridSpec | null = null;
  private field: LuminanceField | null = null;
  private portraitField: LuminanceField | null = null;
  private particles: ParticleSet | null = null;
  private sphere: BlochSphere | null = null;
  private morph: MorphEngine | null = null;

  constructor(
    private portrait: ASCIIScene,
    private reducedMotion = false,
  ) {}

  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
  }

  build(grid: GridSpec) {
    this.grid = grid;
    this.portraitField = this.portrait.build(grid);
    this.particles = particlesFromField(this.portraitField, grid.cellW, grid.cellH);

    this.sphere = new BlochSphere(sphereLayout(grid.width, grid.height), grid.cellW * 0.9);
    this.sphere.project(0, false);
    this.morph = new MorphEngine(
      this.particles,
      this.sphere.out.xy.slice(),
      this.sphere.out.count,
      Math.min(grid.width, grid.height) * 0.1,
    );

    const field = createField(grid.cols, grid.rows);
    field.glyph = new Int16Array(grid.cols * grid.rows).fill(-1);
    this.field = field;
    this.drawnProgress = -1;
    this.compose(0);
    return field;
  }

  update(t: number) {
    const p = this.progress;
    const changed = p !== this.drawnProgress;
    // The sphere keeps rotating once any of it is on screen.
    const live = p > 0 && !this.reducedMotion;
    if (changed || live) this.compose(t);
    return changed || live;
  }

  private compose(t: number) {
    const { field, grid, portraitField, sphere, morph } = this;
    if (!field || !grid || !portraitField || !sphere || !morph) return;
    const p = this.progress;
    this.drawnProgress = p;

    field.glyph!.fill(-1);
    if (p <= 0) {
      field.luminance.set(portraitField.luminance);
      field.accent.set(portraitField.accent);
      return;
    }

    field.luminance.fill(0);
    field.accent.fill(0);
    sphere.project(t, !this.reducedMotion);
    if (p >= 1) this.rasterize(sphere.out);
    else morph.compose(p, sphere.out, field, grid.cellW, grid.cellH);

    // Basis-state labels fade in once the sphere has formed.
    const labelLum = Math.max(0, (p - 0.85) / 0.15) * 0.75;
    if (labelLum > 0) {
      const { top, bottom } = sphere.poles();
      this.label("|0>", top[0], top[1], labelLum);
      this.label("|1>", bottom[0], bottom[1], labelLum);
    }
  }

  private rasterize(pts: { count: number; xy: Float32Array; lum: Float32Array; accent: Uint8Array }) {
    const { field, grid } = this;
    if (!field || !grid) return;
    for (let i = 0; i < pts.count; i++) {
      const l = pts.lum[i];
      if (l <= 0.02) continue;
      const c = Math.floor(pts.xy[i * 2] / grid.cellW);
      const r = Math.floor(pts.xy[i * 2 + 1] / grid.cellH);
      if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) continue;
      const k = r * grid.cols + c;
      if (l > field.luminance[k]) {
        field.luminance[k] = l;
        field.accent[k] = pts.accent[i];
      }
    }
  }

  /** Pin a short label just right of a screen point. */
  private label(text: string, x: number, y: number, lum: number) {
    const { field, grid } = this;
    if (!field || !grid) return;
    const r = Math.floor(y / grid.cellH);
    const c0 = Math.floor(x / grid.cellW) + 2;
    if (r < 0 || r >= grid.rows) return;
    Array.from(text).forEach((ch, k) => {
      const c = c0 + k;
      if (c < 0 || c >= grid.cols) return;
      const i = r * grid.cols + c;
      field.glyph![i] = glyphIndex(ch);
      field.luminance[i] = lum;
      field.accent[i] = 0;
    });
  }
}
