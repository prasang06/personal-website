"use client";

import { useEffect, useRef } from "react";
import { morphProgress } from "@/animations/timeline";
import { ASCIIRenderer } from "@/ascii/ASCIIRenderer";
import { ChapterScene } from "@/scenes/ChapterScene";
import { HoodedScene } from "@/scenes/HoodedScene";
import { loadPortraitScene } from "@/scenes/PortraitScene";

export default function AsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ASCIIRenderer | null = null;
    let scene: ChapterScene | null = null;
    let cancelled = false;

    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim() ||
      "monospace";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Native scroll position is the source of truth for scene progress.
    const onScroll = () => {
      if (!scene || !renderer) return;
      let p = morphProgress(window.scrollY, window.innerHeight);
      // Without motion, cut between states instead of morphing.
      if (reducedMotion) p = p > 0.5 ? 1 : 0;
      scene.setProgress(p);
      renderer.invalidate();
    };

    // Glyphs are baked into an atlas, so the font must be ready first.
    const font = document.fonts.load(`500 16px ${fontFamily}`).catch(() => undefined);
    // Fall back to the procedural figure if the portrait can't load.
    const portrait = loadPortraitScene().catch(() => new HoodedScene());

    Promise.all([portrait, font]).then(([p]) => {
      if (cancelled) return;
      scene = new ChapterScene(p, reducedMotion);
      renderer = new ASCIIRenderer(canvas, { fontFamily, reducedMotion });
      onScroll();
      renderer.setScene(scene);
      renderer.start();
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
