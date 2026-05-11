export type RoadmapStatus = "next" | "planned" | "blocked";

export interface RoadmapItem {
  id: "review" | "production-backend" | "testnet";
  title: string;
  priority: 1 | 2 | 3;
  status: RoadmapStatus;
  outcome: string;
}

export const NEXT_PHASE_ROADMAP: RoadmapItem[] = [
  {
    id: "review",
    title: "Review and harden demo baseline",
    priority: 1,
    status: "next",
    outcome: "A clean reviewable branch with verified tests, known limitations, and no accidental secret persistence.",
  },
  {
    id: "production-backend",
    title: "Replace filesystem demo store with production backend",
    priority: 2,
    status: "planned",
    outcome: "Durable database storage, real auth, RBAC enforcement, migrations, and production observability.",
  },
  {
    id: "testnet",
    title: "Run live GenLayer testnet escrow flow",
    priority: 3,
    status: "planned",
    outcome: "End-to-end create/fund/submit/evaluate flow against a live GenLayer environment using safe testnet accounts.",
  },
];
