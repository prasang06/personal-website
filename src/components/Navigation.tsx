"use client";

import { useEffect, useState } from "react";
import { chapters, profile } from "@/data/profile";

export default function Navigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-start justify-between bg-gradient-to-b from-void via-void/85 to-transparent px-4 pt-4 pb-8 text-xs tracking-[0.18em] sm:px-8 sm:pt-6">
      <a href="#identity" className="text-bright hover:text-lavender">
        {profile.handle}
        <span className="text-muted"> / PERSONAL INTERFACE</span>
      </a>

      <nav className="relative text-right">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="chapter-menu"
          onClick={() => setOpen((v) => !v)}
          className="text-bright hover:text-lavender"
        >
          {open ? "[ CLOSE ]" : "MENU"}
        </button>
        <ol
          id="chapter-menu"
          hidden={!open}
          className="mt-4 space-y-2 border-r border-deep pr-3"
        >
          {chapters.map((c) => (
            <li key={c.id}>
              {c.live ? (
                <a
                  href={`#${c.id}`}
                  onClick={() => setOpen(false)}
                  className="text-lavender hover:text-bright"
                >
                  {c.index} / {c.label.toUpperCase()}
                </a>
              ) : (
                <span className="text-muted" title="Coming soon">
                  {c.index} / {c.label.toUpperCase()}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
