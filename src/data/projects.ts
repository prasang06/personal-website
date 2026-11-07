export type ProjectCategory = "quantum" | "physics" | "intelligence" | "engineering";

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  /** One line for cards. */
  summary: string;
  /** A few sentences for the expanded view. */
  description: string;
  technologies: string[];
  /** Headline results worth surfacing on the card. */
  highlights?: string[];
  github?: string;
  demo?: string;
  status: "active" | "completed" | "research";
  featured: boolean;
  /** Set when the repository belongs to a collaborator. */
  collaboration?: string;
  /** Code isn't public: shown with a PRIVATE tag and no source link. */
  private?: boolean;
}

export const projects: Project[] = [
  {
    id: "quantum-phase-recognition",
    title: "Quantum Phase Recognition Pipeline",
    category: "quantum",
    summary:
      "A variational quantum classifier that learns the phase transition of the transverse-field Ising model from ground states alone.",
    description:
      "End-to-end QML pipeline: build the TFIM Hamiltonian, find its ground state with a from-scratch VQE, then feed the optimised parameters to a variational quantum classifier. Circuits are defined once and consumed by both Qiskit and a custom differentiable JAX statevector simulator, with parameter-shift gradients cross-checked against autodiff.",
    technologies: ["JAX", "Qiskit", "qiskit-aer", "Optax", "VQE", "VQC"],
    highlights: [
      "92.5% accuracy on unseen field values (N = 8 qubits)",
      "Zero-noise extrapolation under modelled T1/T2 and readout noise: 3.6× lower energy error",
      "Learned transition at h ≈ 0.86, the expected finite-size shift below h_c = 1",
      "Matrix-free Hamiltonian, O(n·2ⁿ), scales past the dense-matrix wall",
    ],
    github: "https://github.com/prasang06/Quantum-Phase-Recognition-Pipeline",
    status: "completed",
    featured: true,
  },
  {
    id: "tdse-qubit-dynamics",
    title: "TDSE for Qubit Dynamics",
    category: "quantum",
    summary:
      "Numerical solver for the time-dependent Schrödinger equation, simulating static and driven qubits with Bloch-sphere visualisations.",
    description:
      "A modular simulator for two-level quantum systems under static and time-dependent control Hamiltonians. Tracks probability evolution and renders state trajectories on the Bloch sphere.",
    technologies: ["JAX", "Matplotlib", "Manim"],
    github: "https://github.com/prasang06/TDSE-for-Qubit-Dynamics",
    status: "completed",
    featured: true,
  },
  {
    id: "network-risk-qemcmc",
    title: "Network Risk with QeMCMC",
    category: "quantum",
    summary:
      "Quantum-enhanced Markov chain Monte Carlo for ranking which node to rescue in a network one shock from cascading failure.",
    description:
      "Systemic-risk networks are modelled as Ising spins near a tipping point. Classical Metropolis freezes in one basin and can rank bailout targets backwards; a Trotterised quantum proposal tunnels between collapse regimes and recovers the susceptibility ranking at a fraction of the iteration budget. Built for the Qollab × IonQ hackathon, where it won Best Documentation and Best Quantum Impact at the local level.",
    technologies: ["Python", "QeMCMC", "Ising models"],
    github: "https://github.com/Sammybro11/network-risk-qemcmc",
    demo: "https://network-risk-qemcmc.vercel.app",
    status: "completed",
    featured: true,
    collaboration: "Sammybro11",
  },
  {
    id: "quantum-lattice-gas",
    title: "Quantum Lattice Gas Ensembles",
    category: "physics",
    summary:
      "Exact diagonalisation of the 2D hard-core Bose–Hubbard model to test when microcanonical, canonical and grand-canonical ensembles agree.",
    description:
      "Diagonalises every particle-number sector on 4, 9 and 16-site lattices and builds all three ensembles from one spectrum. Free and repulsive gases converge as ~M^(-1/2); the attractive gas does not, and its number fluctuations grow with size: the finite-size shadow of phase separation.",
    technologies: ["Python", "NumPy", "Exact diagonalisation"],
    highlights: ["Positive finite-size exponent at V/t = −3 signals phase separation"],
    github: "https://github.com/prasang06/Quantum-Lattice-Gas-Ensembles",
    status: "completed",
    featured: true,
  },
  {
    id: "toporag",
    title: "TopoRAG",
    category: "intelligence",
    summary:
      "Topology-aware graph RAG over arXiv: citation graphs, GNN embeddings and LaTeX-tree retrieval to write fully cited literature reviews.",
    description:
      "Ingests raw LaTeX from arXiv, builds a citation graph, and learns structural embeddings with an unsupervised GCN/GAT in JAX + Jraph. Retrieval blends BGE-Large dense search with betweenness centrality to surface both semantic hits and foundational papers, then walks each paper's LaTeX tree to pull specific sections and equations for a locally hosted 31B LLM (Gemma 4) to synthesise.",
    technologies: ["JAX", "Jraph", "GAT", "BGE-Large", "Gemma 4", "FastAPI", "Next.js"],
    github: "https://github.com/prasang06/TopoRAG",
    status: "active",
    featured: true,
  },
  {
    id: "pneumonia-cnn",
    title: "Pneumonia Detection CNN",
    category: "intelligence",
    summary:
      "A custom PyTorch CNN that classifies chest X-rays as normal or pneumonia, with Grad-CAM to show what it looks at.",
    description:
      "Three convolutional blocks and a dense classifier trained on the Kaggle chest X-ray dataset, with weighted sampling for the 74/26 class imbalance. Grad-CAM showed the model relies on both diagnostic features and global anatomy, which points the next iteration at dataset artefacts.",
    technologies: ["PyTorch", "Grad-CAM", "Jupyter"],
    highlights: ["85% F1 and 98% recall on the held-out test set"],
    github: "https://github.com/prasang06/Pneumonia-Detection-CNN",
    status: "completed",
    featured: true,
  },
  {
    id: "distributed-agent-system",
    title: "Distributed Multi-Agent Research System",
    category: "engineering",
    summary:
      "A fully local research and coding assistant: no cloud models, every claim checked against its source.",
    description:
      "A terminal coding agent runs on a self-hosted 27B model; an arXiv research agent gathers quoted evidence and verifies every quote against the source PDF before synthesis; a separate architect model plans larger changes and an independent reviewer checks plans, research and code. One command runs plan → approval → tasks → review → report.",
    technologies: ["Python", "vLLM", "Qwen", "Gemma 4", "OpenCode", "MCP"],
    status: "active",
    featured: true,
    private: true,
  },
  {
    id: "tempo",
    title: "tempo",
    category: "engineering",
    summary:
      "A local-first Pomodoro timer and task manager for the Linux desktop, with small overlay windows that keep running after the main window closes.",
    description:
      "A Tauri 2 desktop app: Rust backend, React UI, SQLite with versioned migrations. The timer is a pure state machine in Rust that derives remaining time from wall-clock timestamps instead of counting down, so it survives reloads, restarts and suspend, and every window renders the one state it is sent. Tasks, projects, a weekly planning board and focus analytics sit on top. Built Linux-first with Wayland-aware fallbacks, and shipped to Windows through CI.",
    technologies: ["Rust", "Tauri 2", "React", "TypeScript", "SQLite", "Zustand", "Tailwind CSS"],
    highlights: [
      "Timer state survives restarts and sleep: time is computed from timestamps, never decremented",
      "Three independent overlay windows kept in sync from a single backend state",
      "One CI pipeline ships AUR, .deb, .rpm, AppImage and a Windows installer",
    ],
    github: "https://github.com/prasang06/tempo",
    status: "active",
    featured: true,
  },
  {
    id: "tise-pinn",
    title: "PINN Schrödinger Eigensolver",
    category: "physics",
    summary:
      "A physics-informed neural network that recovers quantised energies and wavefunctions of the harmonic, infinite-well and Morse potentials.",
    description:
      "Boundary conditions are hard constraints and energies come from a differentiable Rayleigh-quotient loss. A sequential orthogonality scheme isolates excited states, refined with Adam then L-BFGS in float64.",
    technologies: ["PyTorch", "PINNs", "L-BFGS"],
    highlights: ["Matches analytic spectra to ~1e-6 at the ground state, under 1% overall"],
    github: "https://github.com/prasang06/TISE-PINN-IMPLEMENTATION",
    status: "completed",
    featured: true,
  },
  {
    id: "spectral-error-mitigation",
    title: "Spectral Error Mitigation for Field Simulations",
    category: "physics",
    summary:
      "QEC-style redundancy applied to a 1D Klein–Gordon simulation, with a Fourier-space diagnostic for high-frequency noise.",
    description:
      "Borrows the redundancy idea from quantum error correction to stabilise long-time evolution of a relativistic field, and uses a spectral diagnostic to isolate stochastic high-frequency noise.",
    technologies: ["Python", "NumPy", "SciPy"],
    highlights: ["5× better numerical fidelity; L² error and energy drift down ~10×"],
    github: "https://github.com/prasang06/QFT-and-QEC-Mphy",
    status: "completed",
    featured: true,
  },
  {
    id: "quantum-algorithms",
    title: "Quantum Algorithms Suite",
    category: "quantum",
    summary:
      "Deutsch–Jozsa, Bernstein–Vazirani, Grover and phase estimation built end to end in Qiskit, with the maths alongside.",
    description:
      "A self-directed study repository of circuit constructions, oracle designs and complexity notes, validated on Qiskit simulators.",
    technologies: ["Qiskit", "Python"],
    github: "https://github.com/prasang06/quantum-algos",
    status: "completed",
    featured: false,
  },
  {
    id: "zx-rl-gym",
    title: "Mini RL Gym for ZX Circuits",
    category: "quantum",
    summary:
      "A Q-learning agent that learns which ZX-calculus rewrite to apply next to simplify a quantum circuit.",
    description:
      "Converts a deliberately redundant circuit from Qiskit through OpenQASM into a PyZX graph, and trains a tabular agent to shrink it by choosing simplification rules.",
    technologies: ["PyZX", "Qiskit", "Q-learning"],
    github: "https://github.com/prasang06/Mini-RL-Gym-for-Quantum-Circuits-using-ZX-Calc",
    status: "completed",
    featured: false,
  },
  {
    id: "rag-knowledge-assistant",
    title: "RAG Knowledge Assistant",
    category: "intelligence",
    summary: "Query your own PDFs and notes with retrieval-augmented generation.",
    description:
      "Ingests PDF and Markdown, embeds chunks with BGE-small into a FAISS index, and answers questions with an LLM in interactive or batch mode.",
    technologies: ["FAISS", "SentenceTransformers", "Gemini"],
    github: "https://github.com/prasang06/RAG-Knowledge-Assistant",
    status: "completed",
    featured: false,
  },
];

export const projectsIn = (category: ProjectCategory) =>
  projects.filter((p) => p.category === category);
