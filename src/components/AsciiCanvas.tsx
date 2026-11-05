"use client";

import { useEffect, useRef } from "react";
import { ASCIIRenderer } from "@/ascii/ASCIIRenderer";
import { HoodedScene } from "@/scenes/HoodedScene";
import { loadPortraitScene } from "@/scenes/PortraitScene";

export default function AsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ASCIIRenderer | null = null;
    let cancelled = false;

    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim() ||
      "monospace";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Glyphs are baked into an atlas, so the font must be ready first.
    const font = document.fonts.load(`500 16px ${fontFamily}`).catch(() => undefined);
    // Fall back to the procedural figure if the portrait can't load.
    const scene = loadPortraitScene().catch(() => new HoodedScene());

    Promise.all([scene, font]).then(([s]) => {
      if (cancelled) return;
      renderer = new ASCIIRenderer(canvas, { fontFamily, reducedMotion });
      renderer.setScene(s);
      renderer.start();
    });

    return () => {
      cancelled = true;
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
