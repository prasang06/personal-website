import { Fragment } from "react";
import ProjectCard from "@/components/ProjectCard";
import { projects, type ProjectCategory } from "@/data/projects";
import { researchAreas } from "@/data/research";

interface ChapterSectionProps {
  id: string;
  index: string;
  label: string;
  category: ProjectCategory;
  heading: string;
  intro: string;
  topics: string[];
  /** How far below the viewport top the heading block lands (px). */
  headingLanding?: number;
  /**
   * Canvas stage that forms while this chapter's deck is read: it starts
   * at the first card and is complete by the last.
   */
  morphTo?: string;
}

/**
 * Where the first stacked card pins and how much of each earlier card stays
 * visible above the next (desktop only; keep in sync with --deck-top /
 * --deck-peek in globals.css). On phones the cards are a plain list: stacking
 * fought with expanding cards in the little space below the visual.
 */
const DECK_TOP = 104;
const DECK_PEEK = 84;
/** Heading landings: desktop px, phones below the visual. */
const HEADING_MOBILE = "44vh";

/** A chapter's editorial column: content sits left, the canvas visual right. */
export default function ChapterSection({
  id,
  index,
  label,
  category,
  heading,
  intro,
  topics,
  headingLanding = 140,
  morphTo,
}: ChapterSectionProps) {
  const featured = projects.filter((p) => p.category === category && p.featured);
  const areas = researchAreas.filter((a) => a.category === category);

  return (
    <section
      id={id}
      data-chapter={`${index} / ${label.toUpperCase()}`}
      aria-labelledby={`${id}-heading`}
      className="relative px-4 pt-[45vh] pb-32 sm:px-8 md:pt-[30vh]"
    >
      <div className="max-w-xl md:w-[46%] md:max-w-none lg:w-[40%]">
        <div
          aria-hidden="true"
          data-snap={headingLanding}
          data-snap-mobile={HEADING_MOBILE}
          data-landing={id}
        />
        <p className="text-xs tracking-[0.25em] text-muted">
          {index} / {label.toUpperCase()}
        </p>
        <h2
          id={`${id}-heading`}
          className="mt-4 font-display text-4xl leading-none font-semibold tracking-tight text-bright sm:text-6xl"
        >
          {heading}
        </h2>
        <p className="mt-6 text-sm leading-relaxed text-lavender">{intro}</p>
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] tracking-[0.15em] text-muted uppercase">
          {topics.map((t) => (
            <li key={t} className="before:mr-1.5 before:text-plum before:content-['/']">
              {t}
            </li>
          ))}
        </ul>

        {/* Desktop: cards pin one after another and stack like a deck, each
            leaving its header visible; markers record each card's resting
            position so the scroll can land on it (see SmoothScroll). Phones:
            a plain list, and the markers only time the canvas stages. */}
        <div className="relative mt-16">
          {/* Pinned beside the canvas on desktop; on phones it scrolls away so it
              can't outlast the cards and float over them. */}
          <h3 className="z-10 md:sticky md:top-[calc(var(--deck-top)-40px)] bg-gradient-to-b from-void via-void to-transparent pt-3 pb-4 text-[10px] tracking-[0.25em] text-muted">
            SELECTED WORK
          </h3>
          {featured.map((p, i) => {
            const top = DECK_TOP + i * DECK_PEEK;
            const last = i === featured.length - 1;
            return (
              <Fragment key={p.id}>
                <div
                  aria-hidden="true"
                  data-snap={top}
                  data-snap-mobile="none"
                  data-stage-from={morphTo && i === 0 ? morphTo : undefined}
                  data-stage-to={morphTo && i === featured.length - 1 ? morphTo : undefined}
                />
                <div className="md:sticky" style={{ top: `calc(var(--deck-top) + ${i} * var(--deck-peek))` }}>
                  <ProjectCard project={p} index={i} />
                </div>
                {/* Scroll room while this card is the newest on the stack. Spacers,
                    not margins or padding, so stuck cards keep their offsets. */}
                <div aria-hidden="true" className={last ? "h-[20vh] md:h-[35vh]" : "h-4 md:h-[18vh]"} />
              </Fragment>
            );
          })}
        </div>

        {areas.length > 0 && (
          <>
            <h3 className="mt-14 mb-4 text-[10px] tracking-[0.25em] text-muted">
              IN PROGRESS / NOT YET PUBLIC
            </h3>
            <ul className="space-y-4 bg-void/60">
              {areas.map((a) => (
                <li key={a.id} className="border-l border-deep pl-4">
                  <p className="text-sm text-lavender">{a.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{a.summary}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
