"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import Snap from "lenis/snap";
import "lenis/dist/lenis.css";
import { MAGNET_DURATION, MORPH_SPAN, readChoreography } from "@/animations/timeline";

/**
 * Smooth wheel scrolling with soft landings: when scrolling stops close to a
 * key moment, the page eases onto it; elsewhere it scrolls freely. Native
 * scroll position stays the source of truth.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, anchors: true });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return () => lenis.destroy();

    const snap = new Snap(lenis, {
      type: "proximity",
      distanceThreshold: "30%",
      debounce: 260,
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 4),
    });

    // Magnet zones (intro → Now, Timeline → Quantum): one wheel tick inside a
    // zone glides to its end in that direction, playing any morph on the way.
    // Wheel only; touch keeps native momentum and relies on the soft landings.
    let travelling = false;
    let lastWheel = 0;
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Trackpads keep emitting momentum after a glide ends. Swallow wheel input
    // until it has been quiet briefly, so the landing isn't overshot. (Not
    // lenis.stop(): that hides the scrollbar, shifting the layout and canvas.)
    let holding = false;
    const swallowWheel = (e: WheelEvent) => {
      if (!holding) return;
      lastWheel = performance.now();
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("wheel", swallowWheel, { passive: false, capture: true });

    const settle = () => {
      holding = true;
      const arrivedAt = performance.now();
      const poll = () => {
        const now = performance.now();
        if (now - lastWheel > 220 && now - arrivedAt > 350) {
          holding = false;
          travelling = false;
        } else {
          setTimeout(poll, 60);
        }
      };
      poll();
    };

    const offMagnet = lenis.on("virtual-scroll", ({ deltaY, event }) => {
      if (!event.type.includes("wheel")) return;
      lastWheel = performance.now();
      if (travelling || deltaY === 0) return;
      const y = lenis.animatedScroll;
      let target: number | null = null;
      for (const [a, b] of readChoreography().zones) {
        if (deltaY > 0 && y >= a - 2 && y < b - 2) target = b;
        else if (deltaY < 0 && y > a + 2 && y <= b + 2) target = a;
        if (target !== null) break;
      }
      if (target === null) return;

      travelling = true;
      // A full morph-length glide takes MAGNET_DURATION; shorter hops scale down.
      const full = MORPH_SPAN * window.innerHeight;
      const duration = Math.min(MAGNET_DURATION, Math.max(0.8, (MAGNET_DURATION * Math.abs(target - y)) / full));
      lenis.scrollTo(target, {
        duration,
        easing: easeInOut,
        lock: true,
        force: true,
        onComplete: settle,
      });
    });

    // Every `[data-snap]` marker in the page is a resting point; its value is
    // the viewport offset the content should land at.
    let removers: (() => void)[] = [];
    const placeSnaps = () => {
      removers.forEach((remove) => remove());
      const markers = Array.from(document.querySelectorAll<HTMLElement>("[data-snap]")).map(
        (el) => el.getBoundingClientRect().top + window.scrollY - Number(el.dataset.snap),
      );
      removers = [0, ...markers].map((y) => snap.add(Math.round(y)));
    };
    placeSnaps();
    window.addEventListener("resize", placeSnaps);
    // Content height changes (fonts, expanding cards) move the markers.
    const resizeObserver = new ResizeObserver(placeSnaps);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("wheel", swallowWheel, { capture: true });
      offMagnet();
      resizeObserver.disconnect();
      window.removeEventListener("resize", placeSnaps);
      snap.destroy();
      lenis.destroy();
    };
  }, []);

  return null;
}
