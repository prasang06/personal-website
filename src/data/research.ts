import type { ProjectCategory } from "./projects";

/**
 * Ongoing work whose code is private. Deliberately high level: an area and
 * one line, no repository names, results or collaborators' details.
 */
export interface ResearchArea {
  id: string;
  title: string;
  category: ProjectCategory;
  summary: string;
}

export const researchAreas: ResearchArea[] = [
  {
    id: "quantum-communication-rl",
    title: "RL for quantum communication",
    category: "quantum",
    summary:
      "Graph neural network policies and ZX-calculus for optimising quantum repeater chains and related protocols.",
  },
  {
    id: "neural-quantum-states",
    title: "Neural quantum states",
    category: "quantum",
    summary:
      "Variational Monte Carlo with neural-network ansätze for spin glasses and combinatorial problems.",
  },
  {
    id: "qec-decoding",
    title: "Learned QEC decoders",
    category: "quantum",
    summary: "Neural decoders for surface-code quantum error correction.",
  },
  {
    id: "jax-quantum-simulation",
    title: "Accelerated quantum simulation",
    category: "physics",
    summary:
      "A differentiable GPU/TPU library for open quantum systems in JAX, built for pulse optimisation and RL control.",
  },
  {
    id: "quantum-inspired-optimisation",
    title: "Quantum-inspired optimisation",
    category: "physics",
    summary: "Adaptive hybrid solvers for hard combinatorial optimisation problems.",
  },
  {
    id: "ai-on-qpus",
    title: "AI on quantum hardware",
    category: "intelligence",
    summary: "How feasible it is to run learning workloads on today's QPUs.",
  },
  {
    id: "multi-agent-systems",
    title: "Local multi-agent systems",
    category: "intelligence",
    summary: "Multi-agent research tooling built on self-hosted LLMs and distributed GPU inference.",
  },
];
