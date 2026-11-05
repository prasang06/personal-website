"use client";

import { useEffect, useRef } from "react";
import { readChoreography } from "@/animations/timeline";
import { ASCIIRenderer } from "@/ascii/ASCIIRenderer";
import { HoodedScene } from "@/scenes/HoodedScene";
import { loadPortraitScene } from "@/scenes/PortraitScene";
import { createStages } from "@/scenes/stages";
import { StoryScene, type StageStop } from "@/scenes/StoryScene";

/** Where each stage forms, read from markers in the page. */
function computeStops(): StageStop[] {
  return [{ start: 0, at: 0 }, ...readChoreography().stages];
}

export default function AsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ASCIIRenderer | null = null;
    let scene: StoryScene | null = null;
    let cancelled = false;

    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim() ||
      "monospace";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Native scroll position is the source of truth for scene progress.
    const onScroll = () => {
      if (!scene || !renderer) return;
      scene.setScroll(window.scrollY);
      renderer.invalidate();
    };
    // Markers move when layout changes (fonts, resize, expanding cards).
    const onLayout = () => {
      scene?.setStops(computeStops());
      onScroll();
    };
    const layoutObserver = new ResizeObserver(onLayout);
    layoutObserver.observe(document.body);

    // Glyphs are baked into an atlas, so the font must be ready first.
    const font = document.fonts.load(`500 16px ${fontFamily}`).catch(() => undefined);
    // Fall back to the procedural figure if the portrait can't load.
    const portrait = loadPortraitScene().catch(() => new HoodedScene());

    Promise.all([portrait, font]).then(([p]) => {
      if (cancelled) return;
      scene = new StoryScene(createStages(p), reducedMotion);
      renderer = new ASCIIRenderer(canvas, { fontFamily, reducedMotion });
      onLayout();
      renderer.setScene(scene);
      renderer.start();
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelled = true;
      layoutObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      renderer?.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
}
