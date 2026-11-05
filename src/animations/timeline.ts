/**
 * Scroll choreography. Positions come from markers placed in the page, so the
 * canvas morphs, the wheel magnet and the soft landings all stay in step with
 * the content whatever its height.
 *
 * Markers:
 * - `[data-snap="<offset>"]`: a resting point; the marker lands <offset> below the
 *   viewport top. Offsets are px, `vh`, or a sum such as `46vh+64`.
 *   `data-snap-mobile` overrides it below 768px wide.
 * - `[data-landing="<id>"]`: a named resting point (also a `data-snap` marker).
 * - `[data-stage-from="<stage>"]` / `[data-stage-to="<stage>"]`: where a canvas stage
 *   starts forming and is fully formed.
 */

/** Scroll, in viewport heights, over which the portrait becomes the Bloch sphere. */
export const MORPH_SPAN = 1.8;

/** Seconds a full magnet glide takes; shorter hops scale down. */
export const MAGNET_DURATION = 2.4;

/** Pixel offset for a snap value such as `140`, `44vh` or `46vh+64`. */
function parseOffset(value: string | undefined): number {
  if (!value) return 0;
  return value.split("+").reduce((sum, part) => {
    const v = part.trim();
    return sum + (v.endsWith("vh") ? (parseFloat(v) / 100) * window.innerHeight : Number(v) || 0);
  }, 0);
}

/** How far below the viewport top a marker should land. */
export function snapOffset(el: HTMLElement): number {
  const mobile = window.innerWidth < 768 && el.dataset.snapMobile !== undefined;
  return parseOffset(mobile ? el.dataset.snapMobile : el.dataset.snap);
}

/** Scroll position at which a marker element lands. */
export function markerY(el: HTMLElement | null): number | null {
  if (!el) return null;
  return el.getBoundingClientRect().top + window.scrollY - snapOffset(el);
}

const landing = (id: string) => markerY(document.querySelector(`[data-landing="${id}"]`));

/** Scroll, in viewport heights, over which a chapter's visual forms before its heading lands. */
export const ARRIVE_SPAN = 1.1;

export interface StageRange {
  start: number;
  at: number;
}

export interface Choreography {
  /** Wheel magnet stretches: inside one, a wheel tick glides to the end in its direction. */
  zones: [number, number][];
  /** Scroll ranges for every canvas stage after the portrait, in story order. */
  stages: StageRange[];
}

export function readChoreography(): Choreography {
  const vh = window.innerHeight;
  const about = landing("about") ?? vh;
  const quantum = landing("quantum") ?? about + 2 * vh;
  const sphereStart = Math.max(about + 1, quantum - MORPH_SPAN * vh);

  const stageY = (stage: string, edge: "from" | "to") =>
    markerY(document.querySelector(`[data-stage-${edge}="${stage}"]`));
  /** A stage that forms while a chapter's deck is read. */
  const deck = (stage: string, fallback: number): StageRange => {
    const start = stageY(stage, "from") ?? fallback;
    return { start, at: stageY(stage, "to") ?? start + 0.6 * vh };
  };
  /** A stage that forms on the way into a chapter, complete as its heading lands. */
  const arrive = (chapter: string, fallback: number): StageRange => {
    const at = landing(chapter) ?? fallback;
    return { start: at - ARRIVE_SPAN * vh, at };
  };

  // Order matches STAGE_ORDER in scenes/stages.ts (minus the portrait).
  const raw: StageRange[] = [{ start: sphereStart, at: quantum }];
  const last = () => raw[raw.length - 1].at;
  raw.push(deck("qpu", last() + vh));
  raw.push(arrive("physics", last() + 2 * vh));
  raw.push(arrive("intelligence", last() + 2 * vh));
  raw.push(deck("transformer", last() + vh));
  raw.push(arrive("engineering", last() + 2 * vh));
  raw.push(arrive("connect", last() + 2 * vh));

  // Never let ranges overlap or invert, whatever the content heights.
  const stages: StageRange[] = [];
  let floor = about;
  for (const r of raw) {
    const start = Math.max(r.start, floor + 1);
    const at = Math.max(r.at, start + 1);
    stages.push({ start, at });
    floor = at;
  }

  return {
    // Only the portrait → sphere stretch glides; intro → Now scrolls freely
    // (with a soft landing), since nothing on the canvas changes there.
    zones: [[sphereStart, quantum]],
    stages,
  };
}
