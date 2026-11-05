"use client";

import { useEffect, useState } from "react";

/**
 * Bottom corners: current chapter on the left, scroll progress on the right.
 * The chapter comes from whichever `[data-chapter]` section crosses mid-screen.
 */
export default function StatusBar() {
  const [progress, setProgress] = useState(0);
  const [chapter, setChapter] = useState("00 / IDENTITY");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setChapter((e.target as HTMLElement).dataset.chapter ?? "");
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    document.querySelectorAll("[data-chapter]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 hidden items-end justify-between bg-gradient-to-t from-void via-void/85 to-transparent px-8 pt-12 pb-6 text-xs tracking-[0.18em] sm:flex">
      <span className="text-muted">{chapter}</span>
      <span className="flex items-center gap-3 text-muted">
        <span className="relative block h-px w-24 bg-deep">
          <span
            className="absolute inset-y-0 left-0 bg-lavender"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
        <span className="tabular-nums text-lavender">
          {String(Math.round(progress * 100)).padStart(3, "0")}%
        </span>
      </span>
    </footer>
  );
}
