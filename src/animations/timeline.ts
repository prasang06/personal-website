/**
 * Scroll choreography. Positions come from markers placed in the page, so the
 * canvas morphs, the wheel magnet and the soft landings all stay in step with
 * the content whatever its height.
 *
 * Markers:
 * - `[data-snap="<px>"]`: a resting point; the marker lands <px> below the viewport top.
 * - `[data-landing="<id>"]`: a named resting point (also a `data-snap` marker).
 * - `[data-stage-from="<stage>"]` / `[data-stage-to="<stage>"]`: where a canvas stage
 *   starts forming and is fully formed.
 */

/** Scroll, in viewport heights, over which the portrait becomes the Bloch sphere. */
export const MORPH_SPAN = 1.8;

/** Seconds a full magnet glide takes; shorter hops scale down. */
export const MAGNET_DURATION = 2.4;

/** Scroll position at which a marker element lands. */
export function markerY(el: HTMLElement | null): number | null {
  if (!el) return null;
  return el.getBoundingClientRect().top + window.scrollY - Number(el.dataset.snap ?? 0);
}

const landing = (id: string) => markerY(document.querySelector(`[data-landing="${id}"]`));

export interface Choreography {
  /** Wheel magnet stretches: inside one, a wheel tick glides to the end in its direction. */
  zones: [number, number][];
  /** Scroll ranges over which each canvas stage after the portrait forms. */
  stages: Record<"sphere" | "qpu", { start: number; at: number }>;
}

export function readChoreography(): Choreography {
  const vh = window.innerHeight;
  const about = landing("about") ?? vh;
  const sphereAt = landing("quantum") ?? about + 2 * vh;
  const sphereStart = Math.max(about + 1, sphereAt - MORPH_SPAN * vh);

  const stageY = (stage: string, edge: "from" | "to") =>
    markerY(document.querySelector(`[data-stage-${edge}="${stage}"]`));
  const qpuStart = stageY("qpu", "from") ?? sphereAt + vh;
  const qpuAt = Math.max(qpuStart + 1, stageY("qpu", "to") ?? qpuStart + 0.6 * vh);

  return {
    zones: [
      [0, about],
      [sphereStart, sphereAt],
    ],
    stages: {
      sphere: { start: sphereStart, at: sphereAt },
      qpu: { start: qpuStart, at: qpuAt },
    },
  };
}
