import { particlesFromField, type PointSet } from "@/ascii/MorphEngine";
import type { ASCIIScene, GridSpec, LuminanceField } from "@/ascii/types";
import { BlackHoleScene } from "./BlackHoleScene";
import { BlochSphere, sphereLayout, type SphereLayout } from "./BlochSphere";
import { DustScene } from "./DustScene";
import { NetworkScene } from "./NetworkScene";
import { QPUChip } from "./QPUChip";
import { TerminalScene } from "./TerminalScene";
import { TransformerScene } from "./TransformerScene";

export interface StageLabel {
  text: string;
  x: number;
  y: number;
  /** Brightness, default 0.75. */
  lum?: number;
  accent?: boolean;
}

/** One visual in the scroll story. Stages morph into each other in order. */
export interface Stage {
  build(grid: GridSpec): void;
  /** Point cloud for time t; `animate` is false under reduced motion. */
  frame(t: number, animate: boolean): PointSet;
  /** Whether the stage moves on its own while held on screen. */
  readonly animated: boolean;
  /** Pinned text drawn while the stage is (mostly) formed. */
  labels?(t: number, animate: boolean): StageLabel[];
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

/** Anything that projects a point cloud each frame and may label itself. */
interface Geometry {
  readonly out: PointSet;
  project(t: number, animate: boolean): void;
  labels?(t: number, animate: boolean): StageLabel[];
}

/** Adapts a geometry, rebuilt for every grid, into a stage. */
class GeometryStage implements Stage {
  private geometry: Geometry | null = null;

  constructor(
    private make: (layout: SphereLayout, grid: GridSpec) => Geometry,
    readonly animated = true,
  ) {}

  build(grid: GridSpec) {
    this.geometry = this.make(sphereLayout(grid.width, grid.height), grid);
  }

  frame(t: number, animate: boolean) {
    this.geometry!.project(t, animate);
    return this.geometry!.out;
  }

  labels(t: number, animate: boolean) {
    return this.geometry?.labels?.(t, animate) ?? [];
  }
}

const sphere = (layout: SphereLayout, grid: GridSpec) => {
  const s = new BlochSphere(layout, grid.cellW * 0.9);
  return {
    out: s.out,
    project: (t: number, animate: boolean) => s.project(t, animate),
    labels: () => {
      const { top, bottom } = s.poles();
      return [
        { text: "|0>", x: top[0], y: top[1] },
        { text: "|1>", x: bottom[0], y: bottom[1] },
      ];
    },
  };
};

/** The canvas story, in scroll order. Keep in sync with readChoreography(). */
export const STAGE_ORDER = [
  "portrait",
  "sphere",
  "qpu",
  "blackhole",
  "network",
  "transformer",
  "terminal",
  "dust",
] as const;
export type StageId = (typeof STAGE_ORDER)[number];

export function createStages(portrait: ASCIIScene): Stage[] {
  const make: Record<Exclude<StageId, "portrait">, Stage> = {
    sphere: new GeometryStage(sphere),
    qpu: new GeometryStage((l, g) => new QPUChip(l, g.cellW * 0.9)),
    blackhole: new GeometryStage((l, g) => new BlackHoleScene(l, g.cellW * 0.9)),
    network: new GeometryStage((l, g) => new NetworkScene(l, g.cellW * 0.9)),
    transformer: new GeometryStage((l, g) => new TransformerScene(l, g)),
    terminal: new GeometryStage((l, g) => new TerminalScene(l, g)),
    // The ending is centred on the page, not beside the content column.
    dust: new GeometryStage(
      (_, g) =>
        new DustScene({ cx: g.width / 2, cy: g.height / 2, radius: Math.min(g.width, g.height) * 0.42 }),
    ),
  };
  return STAGE_ORDER.map((id) => (id === "portrait" ? new PortraitStage(portrait) : make[id]));
}
