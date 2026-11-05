import AsciiCanvas from "@/components/AsciiCanvas";
import AboutSection from "@/components/AboutSection";
import ChapterSection from "@/components/ChapterSection";
import Navigation from "@/components/Navigation";
import SmoothScroll from "@/components/SmoothScroll";
import StatusBar from "@/components/StatusBar";
import { profile } from "@/data/profile";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <AsciiCanvas />
      <Navigation />

      <main>
        <section
          id="identity"
          data-chapter="00 / IDENTITY"
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

        <AboutSection />

        {/* Scroll room for the portrait-to-sphere morph; see animations/timeline.ts. */}
        <div aria-hidden="true" className="h-[110vh]" />

        <ChapterSection
          id="quantum"
          headingLanding={190}
          morphTo="qpu"
          index="01"
          label="Quantum"
          category="quantum"
          heading="Quantum"
          intro="Variational algorithms, quantum dynamics, optimisation and learning on quantum states: building the simulators and circuits myself, then asking what they can solve and learn."
          topics={["VQE / VQC", "QUBO / QAOA", "Qubit dynamics", "Error mitigation", "ZX-calculus", "QeMCMC"]}
        />

        <ChapterSection
          id="physics"
          index="02"
          label="Physics"
          category="physics"
          heading="Physics"
          intro="Numerical methods for physical systems: exact diagonalisation, physics-informed networks and stable long-time field evolution, checked against the analytic answer wherever one exists."
          topics={["Exact diagonalisation", "Statistical mechanics", "PINNs", "PDE solvers", "Open quantum systems"]}
        />

        <ChapterSection
          id="intelligence"
          index="03"
          label="Intelligence"
          category="intelligence"
          heading="Intelligence"
          intro="Learning systems for science: graph neural networks, retrieval over the research literature, reinforcement learning and models whose decisions can be inspected."
          topics={["GNNs", "RAG", "Reinforcement learning", "Transformers", "Computer vision"]}
        />

        <ChapterSection
          id="engineering"
          index="04"
          label="Engineering"
          category="engineering"
          heading="Engineering"
          intro="The infrastructure underneath: self-hosted LLMs, GPU inference and the tooling that ties models, papers and code together."
          topics={["Distributed inference", "vLLM", "CUDA / HPC", "Linux", "MCP"]}
        />
      </main>

      <StatusBar />
    </>
  );
}
