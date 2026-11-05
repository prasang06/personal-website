import { particlesFromField, type PointSet } from "@/ascii/MorphEngine";
import type { ASCIIScene, GridSpec, LuminanceField } from "@/ascii/types";
import { BlochSphere, sphereLayout } from "./BlochSphere";
import { QPUChip } from "./QPUChip";

export interface StageLabel {
  text: string;
  x: number;
  y: number;
}

/** One visual in the scroll story. Stages morph into each other in order. */
export interface Stage {
  build(grid: GridSpec): void;
  /** Point cloud for time t; `animate` is false under reduced motion. */
  frame(t: number, animate: boolean): PointSet;
  /** Whether the stage moves on its own while held on screen. */
  readonly animated: boolean;
  /** Pinned text drawn while the stage is (mostly) formed. */
  labels?(): StageLabel[];
  /** Exact field to show while held, if better than rasterised points. */
  field?(): LuminanceField | null;
}

/** The intro portrait (or its procedural fallback), as a static cloud. */
export class PortraitStage implements Stage {
  readonly animated = false;
  private source: LuminanceField | null = null;
  private points: PointSet = { count: 0, xy: new Float32Array(), lum: new Float32Array(), accent: new Uint8Array() };

  constructor(private scene: ASCIIScene) {}

  build(grid: GridSpec) {
    this.source = this.scene.build(grid);
    this.points = particlesFromField(this.source, grid.cellW, grid.cellH);
  }

  frame() {
    return this.points;
  }

  field() {
    return this.source;
  }
}

export class SphereStage implements Stage {
  readonly animated = true;
  private sphere: BlochSphere | null = null;

  build(grid: GridSpec) {
    this.sphere = new BlochSphere(sphereLayout(grid.width, grid.height), grid.cellW * 0.9);
  }

  frame(t: number, animate: boolean) {
    this.sphere!.project(t, animate);
    return this.sphere!.out;
  }

  labels() {
    const { top, bottom } = this.sphere!.poles();
    return [
      { text: "|0>", x: top[0], y: top[1] },
      { text: "|1>", x: bottom[0], y: bottom[1] },
    ];
  }
}

export class QPUStage implements Stage {
  readonly animated = true;
  private chip: QPUChip | null = null;

  build(grid: GridSpec) {
    this.chip = new QPUChip(sphereLayout(grid.width, grid.height), grid.cellW * 0.9);
  }

  frame(t: number, animate: boolean) {
    this.chip!.project(t, animate);
    return this.chip!.out;
  }

  labels() {
    return this.chip!.labels();
  }
}
