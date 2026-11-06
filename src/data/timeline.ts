export interface TimelineEntry {
  /** Display date, e.g. "2026" or "Oct 2026". */
  when: string;
  title: string;
  detail?: string;
  kind: "education" | "research" | "achievement" | "leadership" | "event" | "creative";
}

/**
 * Chronological, oldest first: schooling, IIT Hyderabad, what happened in
 * between, Honors, current roles, then what's upcoming.
 */
export const timeline: TimelineEntry[] = [
  {
    when: "2022 – 2024",
    title: "Holy Cross School, Agartala",
    detail: "Class X (ICSE) 2022 and Class XII (ISC) 2024.",
    kind: "education",
  },
  {
    when: "2024",
    title: "Joined IIT Hyderabad",
    detail: "B.Tech in Engineering Physics, 2024 – 2028.",
    kind: "education",
  },
  {
    when: "2026",
    title: "Head of PRO & Ideation, Institute Technical Council",
    detail: "Ran Tech Expo 2026 end to end and brought the Candlelight Concert to Thrust as its pronite.",
    kind: "leadership",
  },
  {
    when: "Jul 2026",
    title: "IBM Qiskit Global Summer School 2026",
    detail: "Quantum Excellence badge (Advanced). Ran error-mitigated circuits on IBM hardware.",
    kind: "achievement",
  },
  {
    when: "Aug 2026",
    title: "Honors in Physics",
    detail: "Approved alongside the B.Tech in Engineering Physics.",
    kind: "education",
  },
  {
    when: "Oct 2026",
    title: "Qollab × IonQ Hackathon",
    detail:
      "Quantum-enhanced MCMC for systemic network risk. Won Best Documentation and Best Quantum Impact at the local level.",
    kind: "achievement",
  },
  {
    when: "Oct 2026",
    title: "Qiskit Fall Fest 2026, IIT Hyderabad",
    detail: "Organising team: workshops, hackathon and speaker sessions.",
    kind: "event",
  },
  {
    when: "Current",
    title: "Undergraduate Research Assistant, IIT Hyderabad",
    detail:
      "With Dr. Sangkha Borah: deep RL with graph-attention policies for sequential optimisation, and a GPU/TPU-accelerated open-quantum-system library in JAX.",
    kind: "research",
  },
  {
    when: "Current",
    title: "Head of Algorithms & ML, QET IIT Hyderabad",
    detail: "Leads the quantum engineering club's technical activities and project groups.",
    kind: "leadership",
  },
  {
    when: "Current",
    title: "Head Internship Coordinator, Office of Career Services",
    detail: "Student communications and shortlisting for on-campus recruitment.",
    kind: "leadership",
  },
  {
    when: "Current",
    title: "Head, Behind the Lens",
    detail: "IIT Hyderabad's filmmaking club. Film editor for IIT-H at Inter-IIT Cultural Meet 8.0.",
    kind: "creative",
  },
  {
    when: "Upcoming",
    title: "Quantum Engineer Intern, Accelequant India Pvt. Ltd.",
    detail: "Quantum-classical optimisation.",
    kind: "research",
  },
];
