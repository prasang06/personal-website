import { createField, type ASCIIScene, type GridSpec } from "@/ascii/types";
import { clamp, hash2, sdEllipse, sdSegment, smin, smoothstep } from "@/ascii/math";

/**
 * An original hooded figure, defined procedurally as signed distance fields and
 * shaded as an inflated height map. Figure space: x right, y down; the hood
 * peak sits near y = -1 and the shoulders run off the bottom edge.
 */

// Key light from the upper left, toward the viewer.
const KEY = normalize3(-0.55, -0.65, 0.55);
// Rim light grazing from the right.
const RIM_X = 0.92;
const RIM_Y = -0.38;

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** Hood outline: an egg narrowing to a soft peak at the top. */
function sdHood(x: number, y: number) {
  const qy = y + 0.38;
  const peak = 1 - 0.3 * clamp(-qy / 0.6);
  return sdEllipse(x / peak, qy, 0.42, 0.6) * peak;
}

/** Opening of the hood, where the face sits in shadow. */
function sdOpening(x: number, y: number) {
  const qy = y + 0.3;
  const peak = 1 - 0.35 * clamp(-qy / 0.38);
  return sdEllipse((x - 0.015) / peak, qy, 0.245, 0.38) * peak;
}

function sdBody(x: number, y: number) {
  const shoulders = sdEllipse(x, y - 1.18, 1.08, 0.78);
  // Fabric falling from the hood onto the shoulders.
  const drape = sdEllipse(x, y - 0.22, 0.5, 0.42);
  return smin(shoulders, drape, 0.18);
}

function sdSilhouette(x: number, y: number) {
  return smin(sdHood(x, y), sdBody(x, y), 0.22);
}

function sdFace(x: number, y: number) {
  const skull = sdEllipse(x - 0.02, y + 0.24, 0.19, 0.27);
  const jaw = sdEllipse(x - 0.02, y + 0.06, 0.135, 0.13);
  return smin(skull, jaw, 0.08);
}

function height(x: number, y: number) {
  const d = sdSilhouette(x, y);
  if (d > 0) return 0;
  let h = 0.42 * (1 - Math.exp(d * 7));

  const dOpen = sdOpening(x, y);
  const recess = smoothstep(0.02, -0.07, dOpen);
  h -= 0.3 * recess;

  // Folds radiate out from the opening and run down the body.
  const fold =
    Math.sin(dOpen * 46 + Math.sin(y * 6) * 1.4) * smoothstep(-0.02, 0.06, dOpen) +
    0.6 * Math.sin(x * 11 + y * 2.5) * smoothstep(0.3, 0.6, y);
  h += 0.012 * fold;

  const dFace = sdFace(x, y);
  if (dFace < 0) h += recess * 0.2 * (1 - Math.exp(dFace * 14));
  return h;
}

interface Sample {
  lum: number;
  rim: number;
}

const EPS = 0.006;

function shade(x: number, y: number): Sample {
  const d = sdSilhouette(x, y);
  if (d > 0.01) return { lum: 0, rim: 0 };

  const h = height(x, y);
  const dx = (height(x + EPS, y) - height(x - EPS, y)) / (2 * EPS);
  const dy = (height(x, y + EPS) - height(x, y - EPS)) / (2 * EPS);
  const [nx, ny, nz] = normalize3(-dx, -dy, 1);

  const diffuse = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
  const edge = Math.pow(1 - nz, 1.6);
  const rim = edge * Math.max(0, (nx * RIM_X + ny * RIM_Y) / Math.hypot(nx, ny || 1e-6));

  const dOpen = sdOpening(x, y);
  const inOpening = smoothstep(0.015, -0.03, dOpen);

  // The hood shadows the face; only the lower jaw and nose catch light.
  const dFace = sdFace(x, y);
  let faceLight = smoothstep(-0.34, 0.0, y) * 0.6 + 0.03;
  // Nose ridge catches the key light; a shadow line marks the mouth.
  faceLight += 0.35 * smoothstep(0.035, 0.0, sdEllipse(x + 0.005, y + 0.16, 0.028, 0.06));
  faceLight *= 1 - 0.6 * smoothstep(0.012, 0.0, Math.abs(y + 0.055 - x * x * 1.5)) * smoothstep(0.08, 0.05, Math.abs(x - 0.02));
  const occlusion = 1 - inOpening * (1 - faceLight * smoothstep(0.02, -0.04, dFace));

  let lum = (0.1 + 0.9 * diffuse) * occlusion * 0.92 + rim * 1.35 * (1 - inOpening * 0.8);

  // Drawstrings hanging from the opening, with aglets at the ends.
  for (const side of [-1, 1]) {
    const ax = side * 0.1;
    const bx = side * 0.135;
    const ds = sdSegment(x, y, ax, 0.11, bx, 0.62);
    lum = Math.max(lum, smoothstep(0.016, 0.004, ds) * 0.62);
    const aglet = Math.hypot(x - bx, y - 0.66);
    lum = Math.max(lum, smoothstep(0.03, 0.01, aglet) * 0.85);
  }

  // Centre seam below the drape.
  lum *= 1 - 0.55 * smoothstep(0.012, 0, Math.abs(x)) * smoothstep(0.55, 0.62, y);

  // Fade the body out toward the bottom of the frame and soften the outline.
  lum *= smoothstep(1.35, 0.75, y) * smoothstep(0.01, -0.012, d);
  void h;
  return { lum: clamp(lum), rim: clamp(rim * smoothstep(0.01, -0.012, d)) };
}

export interface HoodedLayout {
  /** Figure centre in pixels. */
  cx: number;
  cy: number;
  /** Pixels per figure unit. */
  scale: number;
}

export function hoodedLayout(width: number, height: number): HoodedLayout {
  if (width < 768) {
    const scale = Math.min(height * 0.3, width * 0.62);
    return { cx: width * 0.5, cy: height * 0.36, scale };
  }
  const scale = height * 0.47;
  return { cx: width * 0.63, cy: height * 0.5, scale };
}

export class HoodedScene implements ASCIIScene {
  build(grid: GridSpec) {
    const { cols, rows, cellW, cellH, width, height: h } = grid;
    const field = createField(cols, rows);
    const { cx, cy, scale } = hoodedLayout(width, h);

    // 2x2 supersampling per cell.
    const offsets = [0.25, 0.75];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let lum = 0;
        let rim = 0;
        for (const oy of offsets) {
          for (const ox of offsets) {
            const s = shade(
              ((c + ox) * cellW - cx) / scale,
              ((r + oy) * cellH - cy) / scale,
            );
            lum += s.lum;
            rim += s.rim;
          }
        }
        lum /= 4;
        rim /= 4;

        const i = r * cols + c;
        // Contrast curve: keep shadows deep, let highlights bloom.
        field.luminance[i] = clamp(Math.pow(lum, 1.15) * 1.08);
        if (rim > 0.35 && hash2(c, r) < 0.07) field.accent[i] = 1;
      }
    }
    return field;
  }
}
