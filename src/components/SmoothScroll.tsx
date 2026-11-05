"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import Snap from "lenis/snap";
import "lenis/dist/lenis.css";
import { MAGNET_DURATION, quantumLanding, snapPoints } from "@/animations/timeline";

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

    // Magnet between the intro and Quantum: one wheel tick in that stretch
    // glides the whole way (playing the morph), up or down. Wheel only; touch
    // keeps native momentum and relies on the soft landings below.
    let travelling = false;
    let lastWheel = 0;
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Trackpads keep emitting momentum after a glide ends. Hold the page still
    // until the wheel has been quiet briefly, so the landing isn't overshot.
    const settle = () => {
      lenis.stop();
      const arrivedAt = performance.now();
      const poll = () => {
        const now = performance.now();
        if (now - lastWheel > 220 && now - arrivedAt > 350) {
          lenis.start();
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
      const end = quantumLanding(window.innerHeight);
      let target: number | null = null;
      if (deltaY > 0 && y < end - 2) target = end;
      else if (deltaY < 0 && y > 2 && y <= end + 2) target = 0;
      if (target === null) return;

      travelling = true;
      // Shorter hops (e.g. from mid-way) take proportionally less time.
      const duration = Math.max(0.8, (MAGNET_DURATION * Math.abs(target - y)) / end);
      lenis.scrollTo(target, {
        duration,
        easing: easeInOut,
        lock: true,
        force: true,
        onComplete: settle,
      });
    });

    // Fixed choreography points, plus any `[data-snap]` marker in the page,
    // whose value is the viewport offset the content should land at.
    let removers: (() => void)[] = [];
    const placeSnaps = () => {
      removers.forEach((remove) => remove());
      const markers = Array.from(document.querySelectorAll<HTMLElement>("[data-snap]")).map(
        (el) => el.getBoundingClientRect().top + window.scrollY - Number(el.dataset.snap),
      );
      removers = [...snapPoints(window.innerHeight), ...markers].map((y) => snap.add(Math.round(y)));
    };
    placeSnaps();
    window.addEventListener("resize", placeSnaps);
    // Content height changes (fonts, expanding cards) move the markers.
    const resizeObserver = new ResizeObserver(placeSnaps);
    resizeObserver.observe(document.body);

    return () => {
      offMagnet();
      resizeObserver.disconnect();
      window.removeEventListener("resize", placeSnaps);
      snap.destroy();
      lenis.destroy();
    };
  }, []);

  return null;
}
