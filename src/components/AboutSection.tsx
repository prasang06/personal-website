import { now } from "@/data/now";
import { profile } from "@/data/profile";
import { timeline, type TimelineEntry } from "@/data/timeline";

const KIND_LABEL: Record<TimelineEntry["kind"], string> = {
  education: "EDU",
  research: "RES",
  achievement: "ACH",
  leadership: "LEAD",
  event: "EVT",
  creative: "FILM",
};

/** Now + Timeline: who's behind the work, read beside the portrait. */
export default function AboutSection() {
  return (
    <section
      id="about"
      data-chapter="-- / NOW & TIMELINE"
      aria-labelledby="about-heading"
      className="relative px-4 pt-[40vh] pb-24 sm:px-8 md:pt-[22vh]"
    >
      <div className="max-w-xl md:w-[46%] md:max-w-none lg:w-[40%]">
        <div aria-hidden="true" data-snap={140} data-landing="about" />
        <p className="text-xs tracking-[0.25em] text-muted">-- / NOW</p>
        <h2
          id="about-heading"
          className="mt-4 font-display text-4xl leading-none font-semibold tracking-tight text-bright sm:text-6xl"
        >
          Now
        </h2>
        <p className="mt-6 text-sm leading-relaxed text-lavender">{profile.role}.</p>

        <ul className="mt-8 space-y-3 bg-void/60 text-sm leading-relaxed text-lavender">
          {now.items.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="text-ember">
                &gt;
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-l border-ember/60 pl-4 text-sm text-bright">{now.availability}</p>
        <p className="mt-3 text-[10px] tracking-[0.25em] text-muted">UPDATED {now.updated.toUpperCase()}</p>

        <h3 className="mt-24 text-xs tracking-[0.25em] text-muted">-- / TIMELINE</h3>
        <ol className="mt-6 bg-void/60">
          {timeline.map((e) => (
            <li
              key={e.title}
              className="grid grid-cols-[6.5rem_1fr] gap-x-4 border-t border-deep/80 py-4 sm:grid-cols-[7.5rem_1fr]"
            >
              <span className="pt-0.5 text-[11px] leading-relaxed tracking-wider text-muted">
                {e.when}
                <span className="mt-1 block text-[9px] tracking-[0.25em] text-plum">{KIND_LABEL[e.kind]}</span>
              </span>
              <span>
                <span className="block text-sm text-bright">{e.title}</span>
                {e.detail && (
                  <span className="mt-1 block text-xs leading-relaxed text-muted">{e.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
