/**
 * Scroll choreography, in viewport heights. The canvas morph and the scroll
 * snap points both read from here so they stay in step.
 */

/** Scroll before the portrait starts to fragment. */
export const MORPH_START = 0.15;
/** Scroll over which the portrait becomes the Bloch sphere. */
export const MORPH_SPAN = 1.8;

/** Seconds the intro → Quantum glide takes when the magnet carries the visitor. */
export const MAGNET_DURATION = 2.4;

/** Portrait → sphere progress for a scroll position. */
export function morphProgress(scrollY: number, viewportH: number) {
  return (scrollY / viewportH - MORPH_START) / MORPH_SPAN;
}

/** Scroll position where the sphere has fully formed and Quantum begins. */
export function quantumLanding(viewportH: number) {
  return Math.round((MORPH_START + MORPH_SPAN) * viewportH);
}

/**
 * Resting points the page eases into when the visitor stops nearby:
 * the intro, and the moment the sphere has fully formed.
 */
export function snapPoints(viewportH: number) {
  return [0, quantumLanding(viewportH)];
}
