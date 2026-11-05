export const profile = {
  handle: "PD_001",
  name: "Prasang Das",
  role: "Quantum computing & AI research engineer at IIT Hyderabad",
  tagline: "Physics, computation and intelligence.",
  summary:
    "Using computation to understand physical systems, at the intersection of quantum computing, scientific computing and artificial intelligence.",
  education: {
    degree: "B.Tech, Engineering Physics (Honors in Physics)",
    institute: "Indian Institute of Technology Hyderabad",
    years: "2024 – 2028",
  },
  links: {
    github: "https://github.com/prasang06",
    linkedin: "https://www.linkedin.com/in/prasang0",
    /** Personal first, institute second. */
    emails: ["prasangdas06@gmail.com", "ep24btech11020@iith.ac.in"],
  },
};

/** From the GitHub profile card; feeds the Engineering chapter. */
export const stack: { label: string; items: string[] }[] = [
  { label: "langs", items: ["Python", "C++", "C", "Julia", "Bash"] },
  { label: "sci", items: ["JAX", "Diffrax", "NumPy", "SciPy"] },
  { label: "ml", items: ["PyTorch", "TensorFlow", "Optax"] },
  { label: "quantum", items: ["Qiskit", "PennyLane", "QuTiP", "NetKet", "IBM Quantum"] },
  { label: "infra", items: ["CUDA", "Linux", "HPC", "Distributed inference", "vLLM"] },
];

export interface Chapter {
  id: string;
  index: string;
  label: string;
  /** Whether the chapter's section exists on the page yet. */
  live: boolean;
}

export const chapters: Chapter[] = [
  { id: "identity", index: "00", label: "Identity", live: true },
  { id: "quantum", index: "01", label: "Quantum", live: false },
  { id: "physics", index: "02", label: "Physics", live: false },
  { id: "intelligence", index: "03", label: "Intelligence", live: false },
  { id: "engineering", index: "04", label: "Engineering", live: false },
  { id: "connect", index: "05", label: "Connect", live: false },
];
