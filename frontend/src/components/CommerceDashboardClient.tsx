"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleCheck,
  FileSearch,
  IdCard,
  Inbox,
  ListChecks,
  Scale,
  Search,
  ShieldCheck,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import {
  WalletAwareDashboardReadiness,
  WalletUnavailableDashboardReadiness,
} from "@/components/WalletAwareReadiness";
import Sidebar from "@/components/Sidebar";
import WalletConnectStatus from "@/components/WalletConnectStatus";
import StatusChip from "@/components/ui/StatusChip";
import { getMergedCommerceCases } from "@/lib/lexnet-client-store";
import {
  buildCommandCenterMetrics,
  buildCommerceCaseStats,
  buildHighPriorityReviews,
  buildVerificationSummary,
} from "@/lib/lexnet-domain";
import { type LexNetContractEnvironment } from "@/lib/lexnet-contract";
import type { CommerceCase } from "@/lib/lexnet-types";
import type { LexNetRuntimeMode } from "@/lib/lexnet-service";
import type { DashboardQueueItem, PlatformSummary } from "@/lib/platform/types";

type CaseFilter = "all" | "active" | "needs-review" | "verified";

const filters: Array<{ value: CaseFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "needs-review", label: "Needs Review" },
  { value: "verified", label: "Verified" },
];

export default function CommerceDashboardClient({
  seedCases,
  runtimeMode,
  contractEnvironment,
  platformSummary,
  queueItems = [],
}: {
  seedCases: CommerceCase[];
  runtimeMode: LexNetRuntimeMode;
  contractEnvironment: LexNetContractEnvironment;
  platformSummary?: PlatformSummary;
  queueItems?: DashboardQueueItem[];
}) {
  const [cases, setCases] = useState(seedCases);
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setCases(getMergedCommerceCases(seedCases));
  }, [seedCases]);

  const stats = useMemo(() => buildCommerceCaseStats(cases), [cases]);
  const commandMetrics = useMemo(() => buildCommandCenterMetrics(cases), [cases]);
  const highPriorityReviews = useMemo(() => buildHighPriorityReviews(cases), [cases]);
  const filteredCases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cases.filter((commerceCase) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          commerceCase.id,
          commerceCase.title,
          commerceCase.buyer,
          commerceCase.seller,
          commerceCase.agreementText,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "active") {
        return ["ACTIVE", "EVIDENCE_SUBMITTED", "UNDER_AI_REVIEW"].includes(
          commerceCase.status
        );
      }
      if (filter === "needs-review") {
        return ["REVISION_REQUESTED", "DISPUTED", "SETTLEMENT_RECOMMENDED"].includes(
          commerceCase.status
        );
      }
      if (filter === "verified") {
        return commerceCase.status === "VERIFIED";
      }
      return true;
    });
  }, [cases, filter, search]);

  const selectedCase = filteredCases[0] ?? cases[0] ?? null;
  const runtimeLabel =
    runtimeMode === "contract-configured"
      ? "Contract Configured / Local Verification"
      : "Local Verification";

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame">
          <header className="topbar hero-panel">
            <div>
              <div className="section-label">
                <Inbox size={14} strokeWidth={1.75} />
                Trust Case Queue
              </div>
              <h1 className="topbar-title">Evidence Review</h1>
              <p className="topbar-subtitle">
                Prioritize commerce cases, inspect evidence, and review AI recommendations
                before an operator decides the next action.
              </p>
            </div>
            <div className="topbar-actions">
              <label className="search-box">
                <Search size={15} strokeWidth={1.75} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search cases"
                />
              </label>
              <span className="status-chip info">{runtimeLabel}</span>
              <WalletConnectStatus />
              <Link href="/cases/new" className="btn-primary">
                New Case
                <ArrowUpRight size={15} strokeWidth={1.75} />
              </Link>
            </div>
          </header>

          <section className="metric-grid" style={{ marginBottom: 18 }}>
            <MetricCard
              icon={<ShieldCheck size={18} strokeWidth={1.75} />}
              label="Reviewed Value"
              value={`$${commandMetrics.protectedValue.toLocaleString()}`}
            />
            <MetricCard
              icon={<Activity size={18} strokeWidth={1.75} />}
              label="AI Reviewed"
              value={commandMetrics.aiReviewedCases.toLocaleString()}
            />
            <MetricCard
              icon={<BadgeCheck size={18} strokeWidth={1.75} />}
              label="Recommendation Ready"
              value={commandMetrics.settlementReadyCases.toLocaleString()}
            />
            <MetricCard
              icon={<IdCard size={18} strokeWidth={1.75} />}
              label="Trust Passports"
              value={commandMetrics.passportsIssued.toLocaleString()}
            />
          </section>

          <section className="panel command-strip hero-panel" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-label">
                <Workflow size={14} strokeWidth={1.75} />
                AI Commerce Trust Pipeline
              </div>
              <h2 style={{ marginTop: 8, color: "var(--ink)", fontSize: 20, fontWeight: 900 }}>
                Pilot walkthrough: evidence to recommendation to trust signal
              </h2>
              <p className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
                This local pilot shows review recommendations only. LexNet does not custody funds,
                release payouts, or claim settlement finality in this workflow.
              </p>
            </div>
            <div className="pipeline-steps">
              {["Intake", "Evidence", "AI Review", "Operator Action", "Passport"].map((step, index) => (
                <div key={step} className="pipeline-step">
                  <span>{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-grid workspace-shell">
            <div className="panel review-panel" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 18,
                  borderBottom: "1px solid var(--border)",
                  background: "linear-gradient(180deg, rgba(251,250,247,0.92), rgba(255,255,255,0.82))",
                }}
              >
                <div>
                  <div className="section-label">Case Inbox</div>
                  <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 13 }}>
                    {filteredCases.length} case records visible
                  </div>
                </div>
                <div className="segmented">
                  {filters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={filter === item.value ? "active" : ""}
                      onClick={() => setFilter(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="queue-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Status</th>
                      <th>Evidence</th>
                      <th>Value</th>
                      <th>Verdict</th>
                      <th>Next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((commerceCase) => {
                      const summary = buildVerificationSummary(commerceCase);

                      return (
                        <tr key={commerceCase.id}>
                          <td>
                            <Link
                              href={`/cases/${commerceCase.id}`}
                              style={{ textDecoration: "none" }}
                            >
                              <div className="case-title">{commerceCase.title}</div>
                              <div className="case-subtitle mono">
                                {shortId(commerceCase.buyer)} &rarr; {shortId(commerceCase.seller)}
                              </div>
                            </Link>
                          </td>
                          <td>
                            <StatusChip status={commerceCase.status} />
                          </td>
                          <td>{commerceCase.evidence.length}</td>
                          <td>${commerceCase.amountReference.toLocaleString()}</td>
                          <td>{summary.scoreLabel}</td>
                          <td>
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>
                              {summary.nextAction}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="action-rail">
              <div className="panel hero-panel" style={{ display: "grid", gap: 12 }}>
                <div className="section-label">
                  <ListChecks size={14} strokeWidth={1.75} />
                  Pilot Operator Brief
                </div>
                <div className="inspector-list">
                  <InspectorRow label="Workflow" value="Recommendation-only review" />
                  <InspectorRow label="Primary action" value="Review evidence and next step" />
                  <InspectorRow label="Public output" value="Privacy-safe passport signals" />
                </div>
              </div>

              <div className="panel" style={{ display: "grid", gap: 12 }}>
                <div className="section-label">
                  <Activity size={14} strokeWidth={1.75} />
                  High Priority Reviews
                </div>
                {highPriorityReviews.map((review) => (
                  <Link key={review.caseId} href={`/cases/${review.caseId}`} className="priority-card">
                    <span>
                      <strong>{review.title}</strong>
                      <small>{review.priorityReason}</small>
                    </span>
                    <ArrowRight size={14} strokeWidth={1.75} />
                  </Link>
                ))}
              </div>

              {platformSummary ? (
                <div className="panel" style={{ display: "grid", gap: 12 }}>
                  <div className="section-label">
                    <ShieldCheck size={14} strokeWidth={1.75} />
                    Backend Store
                  </div>
                  <div className="inspector-list">
                    <InspectorRow label="Persisted Cases" value={platformSummary.caseCount.toLocaleString()} />
                    <InspectorRow label="Reports" value={countReports(cases).toLocaleString()} />
                    <InspectorRow label="Passports" value={platformSummary.publishedPassportCount.toLocaleString()} />
                    <InspectorRow label="Audit Events" value={platformSummary.auditEventCount.toLocaleString()} />
                  </div>
                </div>
              ) : null}

              <div className="panel" style={{ display: "grid", gap: 12 }}>
                <div className="section-label">
                  <Inbox size={14} strokeWidth={1.75} />
                  Operator Queue
                </div>
                {queueItems.length > 0 ? (
                  queueItems.slice(0, 3).map((item) => (
                    <Link key={item.id} href={`/cases/${item.caseId}`} className="priority-card">
                      <span>
                        <strong>{item.caseId}</strong>
                        <small>{formatQueueStatus(item.status)} · {formatQueuePriority(item.priority)} priority</small>
                      </span>
                      <ArrowRight size={14} strokeWidth={1.75} />
                    </Link>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    No backend queue items yet.
                  </p>
                )}
              </div>

              {process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? (
                <WalletAwareDashboardReadiness contractEnvironment={contractEnvironment} />
              ) : (
                <WalletUnavailableDashboardReadiness contractEnvironment={contractEnvironment} />
              )}
              <EvidenceInspector commerceCase={selectedCase} />
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function EvidenceInspector({
  commerceCase,
}: {
  commerceCase: CommerceCase | null;
}) {
  if (!commerceCase) {
    return (
      <aside className="inspector">
        <div className="section-label">Evidence Review</div>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          No cases match the current filters.
        </p>
      </aside>
    );
  }

  const summary = buildVerificationSummary(commerceCase);
  const report = commerceCase.verificationReport;
  const riskFlags = report?.riskFlags ?? [];

  return (
    <aside className="inspector" style={{ display: "grid", gap: 16 }}>
      <div>
        <div className="section-label">
          <FileSearch size={14} strokeWidth={1.75} />
          Evidence Review
        </div>
        <h2 style={{ marginTop: 10, color: "var(--ink)", fontSize: 19, fontWeight: 800 }}>
          {commerceCase.title}
        </h2>
        <p className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
          {commerceCase.agreementText}
        </p>
      </div>

      <div className="inspector-list">
        <InspectorRow label="Case ID" value={commerceCase.id} mono />
        <InspectorRow label="Evidence" value={`${commerceCase.evidence.length} item(s)`} />
        <InspectorRow label="Value" value={`$${commerceCase.amountReference.toLocaleString()}`} />
      </div>

      <div className="panel" style={{ background: "var(--surface)" }}>
        <div className="section-label">
          <Scale size={14} strokeWidth={1.75} />
          AI Verdict
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <SmallMetric label="Verdict" value={summary.label} />
          <SmallMetric label="Score" value={summary.scoreLabel} />
          <SmallMetric label="Seller Share" value={summary.sellerShareLabel} />
          <SmallMetric label="Status" value={commerceCase.status.replaceAll("_", " ")} />
        </div>
      </div>

      <div>
        <div className="section-label">
          <TriangleAlert size={14} strokeWidth={1.75} />
          Risk Flags
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {riskFlags.length > 0 ? (
            riskFlags.map((flag) => (
              <span key={flag} className="risk-chip">
                <TriangleAlert size={14} strokeWidth={1.75} />
                {flag}
              </span>
            ))
          ) : (
            <span className="status-chip success">
              <CircleCheck size={13} strokeWidth={1.75} />
              No active risk flags
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 8,
          border: "1px solid rgba(15,118,110,0.22)",
          background: "var(--teal-soft)",
        }}
      >
        <div className="section-label" style={{ color: "var(--teal)" }}>
          Settlement Recommendation
        </div>
        <p style={{ marginTop: 9, color: "var(--teal-strong)", fontSize: 13, lineHeight: 1.55 }}>
          {report?.recommendation ?? "Run verification to generate a settlement recommendation."}
        </p>
      </div>

      <Link href={`/cases/${commerceCase.id}`} className="btn-secondary">
        Open case file
        <ArrowUpRight size={15} strokeWidth={1.75} />
      </Link>
    </aside>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-label">
        {label}
        <span style={{ color: "var(--teal)" }}>{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: "10px 11px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface-subtle)",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          color: "var(--ink)",
          fontSize: 13,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InspectorRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="inspector-row">
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
        {label}
      </span>
      <span
        className={mono ? "mono" : ""}
        style={{
          minWidth: 0,
          color: "var(--ink)",
          fontSize: 12,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function countReports(cases: CommerceCase[]): number {
  return cases.filter((commerceCase) => commerceCase.verificationReport).length;
}

function formatQueueStatus(status: DashboardQueueItem["status"]): string {
  return status.replaceAll("_", " ");
}

function formatQueuePriority(priority: DashboardQueueItem["priority"]): string {
  return priority[0].toUpperCase() + priority.slice(1);
}

function shortId(value: string): string {
  if (value.length <= 14) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
