import type { Project } from "@/data/projects";

const STATUS_LABEL: Record<Project["status"], string> = {
  active: "ACTIVE",
  completed: "SHIPPED",
  research: "RESEARCH",
};

/**
 * Summary, stack and links are always visible; the longer description and
 * results open on hover or keyboard focus, and on touch screens via a
 * DETAILS toggle (a visually hidden checkbox, so no client JS).
 */
export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const repo = project.github?.replace("https://github.com/", "");
  const toggleId = `more-${project.id}`;

  return (
    <article className="group relative border-t border-plum/70 bg-void py-5 shadow-[0_-12px_32px_-8px_rgb(11_2_22)] focus-within:bg-[#140427] hover:bg-[#140427] sm:px-4 sm:py-6">
      <header className="flex items-baseline justify-between gap-4 text-[10px] tracking-[0.2em] text-muted">
        <span>
          {String(index + 1).padStart(2, "0")} / {STATUS_LABEL[project.status]}
        </span>
        {project.collaboration && <span>WITH {project.collaboration.toUpperCase()}</span>}
      </header>

      <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-bright sm:text-2xl">
        {project.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-lavender">{project.summary}</p>

      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 group-focus-within:grid-rows-[1fr] group-hover:grid-rows-[1fr] group-has-[:checked]:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <p className="mt-3 text-sm leading-relaxed text-muted">{project.description}</p>
          {project.highlights && (
            <ul className="mt-3 space-y-1 text-xs leading-relaxed text-lavender">
              {project.highlights.map((h) => (
                <li key={h} className="before:mr-2 before:text-ember before:content-['>']">
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] tracking-wider">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-muted">
          {project.technologies.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <span className="ml-auto flex gap-4">
          {/* Touch screens have no hover: tap to expand instead. */}
          {/* The checkbox lives inside the label so focusing it on tap can't
              scroll the page up to the top of the card. */}
          <label className="relative hidden cursor-pointer text-lavender hover:text-bright [@media(hover:none)]:inline">
            <input type="checkbox" id={toggleId} className="sr-only" aria-label={`Show details for ${project.title}`} />
            <span className="group-has-[:checked]:hidden">[ + DETAILS ]</span>
            <span className="hidden group-has-[:checked]:inline">[ - LESS ]</span>
          </label>
          {project.demo && (
            <a href={project.demo} target="_blank" rel="noreferrer" className="text-lavender hover:text-bright">
              [ DEMO ]
            </a>
          )}
          {project.private && <span className="text-muted">[ PRIVATE ]</span>}
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              className="text-lavender hover:text-bright"
              aria-label={`${project.title} on GitHub (${repo})`}
            >
              [ SOURCE ]
            </a>
          )}
        </span>
      </footer>
    </article>
  );
}
