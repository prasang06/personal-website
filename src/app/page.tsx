import AsciiCanvas from "@/components/AsciiCanvas";
import Navigation from "@/components/Navigation";
import StatusBar from "@/components/StatusBar";
import { profile } from "@/data/profile";

export default function Home() {
  return (
    <>
      <AsciiCanvas />
      <Navigation />

      <main>
        <section
          id="identity"
          className="relative flex min-h-dvh flex-col justify-end px-4 pb-10 sm:px-8 sm:pb-24"
        >
          <p
            className="rise absolute top-16 right-8 hidden text-right text-[10px] leading-relaxed tracking-[0.2em] text-muted sm:block"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="text-lavender">●</span> SYSTEM ONLINE
            <br />
            RENDER / CANVAS_2D
          </p>

          {/* Scrim keeps the copy legible where it overlaps the figure on phones. */}
          <div className="relative max-w-xl before:absolute before:-inset-x-4 before:-inset-y-10 before:-z-10 before:bg-gradient-to-t before:from-void before:via-void/80 before:to-transparent sm:before:hidden">
            <p
              className="rise mb-6 text-xs tracking-[0.25em] text-muted"
              style={{ animationDelay: "1.2s" }}
            >
              {profile.handle} / PERSONAL INTERFACE
            </p>
            <h1
              className="rise font-display text-5xl leading-[0.95] font-semibold tracking-tight text-bright uppercase sm:text-7xl lg:text-8xl"
              style={{ animationDelay: "1.4s" }}
            >
              {profile.name}
            </h1>
            <p
              className="rise mt-6 text-sm tracking-[0.12em] text-lavender uppercase"
              style={{ animationDelay: "1.6s" }}
            >
              {profile.tagline}
            </p>
            <p
              className="rise mt-4 max-w-sm text-sm leading-relaxed text-muted"
              style={{ animationDelay: "1.75s" }}
            >
              {profile.summary}
            </p>
            <p
              className="rise mt-10 text-xs tracking-[0.25em] text-lavender"
              style={{ animationDelay: "2.1s" }}
            >
              [ SCROLL TO EXPLORE ]<span className="cursor ml-2 text-bright">_</span>
            </p>
          </div>
        </section>
      </main>

      <StatusBar chapter="00 / IDENTITY" />
    </>
  );
}
