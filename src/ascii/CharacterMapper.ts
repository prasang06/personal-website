import { clamp, lerp } from "./math";

/** Characters ordered from empty to dense. */
export const RAMP = " .,:;+=*#%@";

/** Glyphs used for scrambles and flicker. */
export const GLITCH = "01<>/\\|_-+=*#%@$&?!{}[]";

/** Characters available for pinned labels drawn inside the canvas. */
export const LABEL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789|<>/_-.:()";

/** Number of discrete brightness levels the atlas is rendered with. */
export const LEVELS = 32;

type RGB = [number, number, number];

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

// Purple palette: deepest stops nearly vanish into the background,
// the brightest characters bloom toward lavender-white.
const PURPLE: [number, RGB][] = [
  [0.0, hex("#1A0430")],
  [0.22, hex("#3C0D70")],
  [0.45, hex("#52227F")],
  [0.62, hex("#8B63B8")],
  [0.8, hex("#C9B7DD")],
  [1.0, hex("#F4EEFB")],
];

const ACCENT: [number, RGB][] = [
  [0.0, hex("#5A2410")],
  [0.5, hex("#C2571F")],
  [1.0, hex("#FF9B52")],
];

function sampleStops(stops: [number, RGB][], t: number): string {
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    if (t <= t1) {
      const [t0, c0] = stops[i - 1];
      const k = (t - t0) / (t1 - t0);
      const rgb = c0.map((v, j) => Math.round(lerp(v, c1[j], k)));
      return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    }
  }
  const last = stops[stops.length - 1][1];
  return `rgb(${last[0]},${last[1]},${last[2]})`;
}

export const purpleAt = (t: number) => sampleStops(PURPLE, t);
export const accentAt = (t: number) => sampleStops(ACCENT, t);

export function levelOf(lum: number) {
  return Math.min(LEVELS - 1, Math.max(0, Math.floor(lum * LEVELS)));
}

/** Ramp index for a brightness level. */
export function rampIndexOf(level: number) {
  return Math.min(RAMP.length - 1, Math.floor((level / LEVELS) * RAMP.length));
}
