import { profile } from "@/data/profile";

/** A quiet ending: the session closes and the ways to reach out remain. */
export default function ConnectSection() {
  const links = [
    { label: "GITHUB", href: profile.links.github, text: "github.com/prasang06" },
    { label: "LINKEDIN", href: profile.links.linkedin, text: "linkedin.com/in/prasang0" },
    ...profile.links.emails.map((e, i) => ({
      label: i === 0 ? "EMAIL" : "EMAIL / IITH",
      href: `mailto:${e}`,
      text: e,
    })),
  ];

  return (
    <section
      id="connect"
      data-chapter="05 / CONNECT"
      aria-labelledby="connect-heading"
      className="relative flex min-h-dvh flex-col items-center justify-center px-4 pt-[30vh] pb-32 text-center sm:px-8"
    >
      <div className="w-full max-w-xl">
        <div aria-hidden="true" data-snap={140} data-landing="connect" />
        <p className="text-xs tracking-[0.25em] text-muted">05 / CONNECT</p>
        <h2
          id="connect-heading"
          className="mt-4 font-display text-4xl leading-tight font-semibold tracking-tight text-bright sm:text-5xl"
        >
          Session complete.
          <span className="block text-lavender">But the work continues.</span>
        </h2>

        <ul className="mt-12 bg-void/60">
          {links.map((l) => (
            <li key={l.href} className="border-t border-deep/80">
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="group flex items-baseline justify-between gap-6 py-4 text-left text-sm"
              >
                <span className="text-[10px] tracking-[0.25em] text-muted">{l.label}</span>
                <span className="text-lavender group-hover:text-bright">
                  {l.text}
                  <span aria-hidden="true" className="ml-2 text-plum group-hover:text-ember">
                    -&gt;
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-16 text-sm tracking-[0.2em] text-lavender">
          &gt; exit<span className="cursor text-bright">_</span>
        </p>
      </div>
    </section>
  );
}
