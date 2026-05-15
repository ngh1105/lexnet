import { CircleAlert, CircleCheck, Clock3, TriangleAlert } from "@/components/icons";
import type { CommerceCaseStatus } from "@/lib/lexnet-types";

const statusMeta: Record<CommerceCaseStatus, { label: string; className: string; icon: typeof CircleCheck }> = {
  VERIFIED: { label: "Verified", className: "success", icon: CircleCheck },
  EVIDENCE_SUBMITTED: { label: "Needs Review", className: "warning", icon: Clock3 },
  UNDER_AI_REVIEW: { label: "Needs Review", className: "warning", icon: Clock3 },
  REVISION_REQUESTED: { label: "Needs Review", className: "warning", icon: TriangleAlert },
  SETTLEMENT_RECOMMENDED: { label: "Needs Review", className: "warning", icon: TriangleAlert },
  DISPUTED: { label: "Disputed", className: "danger", icon: CircleAlert },
  DRAFT: { label: "Active", className: "info", icon: Clock3 },
  ACTIVE: { label: "Active", className: "info", icon: Clock3 },
};

export default function StatusChip({ status }: { status: CommerceCaseStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={`status-chip ${meta.className}`}>
      <Icon size={13} strokeWidth={1.75} />
      {meta.label}
    </span>
  );
}
