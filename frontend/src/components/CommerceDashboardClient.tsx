"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CircleCheck,
  CircleDollarSign,
  FileSearch,
  Inbox,
  Scale,
  Search,
  TriangleAlert,
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
  buildCommerceCaseStats,
  buildVerificationSummary,
} from "@/lib/lexnet-domain";
import { type LexNetContractEnvironment } from "@/lib/lexnet-contract";
import type { CommerceCase } from "@/lib/lexnet-types";
import type { LexNetRuntimeMode } from "@/lib/lexnet-service";

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
}: {
  seedCases: CommerceCase[];
  runtimeMode: LexNetRuntimeMode;
  contractEnvironment: LexNetContractEnvironment;
}) {
  const [cases, setCases] = useState(seedCases);
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setCases(getMergedCommerceCases(seedCases));
  }, [seedCases]);

  const stats = useMemo(() => buildCommerceCaseStats(cases), [cases]);
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
          <header className="topbar">
            <div>
              <div className="section-label">
                <Inbox size={14} strokeWidth={1.75} />
                Trust Case Queue
              </div>
              <h1 className="topbar-title">Evidence Review</h1>
              <p className="topbar-subtitle">
                Prioritize commerce cases, inspect evidence, and review AI
                settlement recommendations.
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

          <section className="metric-grid" style={{ marginBottom: 16 }}>
            <MetricCard
              icon={<Inbox size={18} strokeWidth={1.75} />}
              label="Commerce Cases"
              value={stats.totalCases.toLocaleString()}
            />
            <MetricCard
              icon={<FileSearch size={18} strokeWidth={1.75} />}
              label="Active Reviews"
              value={stats.activeCases.toLocaleString()}
            />
            <MetricCard
              icon={<BadgeCheck size={18} strokeWidth={1.75} />}
              label="Settlement Ready"
              value={stats.settlementReady.toLocaleString()}
            />
            <MetricCard
              icon={<CircleDollarSign size={18} strokeWidth={1.75} />}
              label="Referenced Value"
              value={`$${stats.totalReferencedValue.toLocaleString()}`}
            />
          </section>

          <section className="dashboard-grid">
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 14,
                  borderBottom: "1px solid var(--border)",
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

            <aside style={{ display: "grid", gap: 16 }}>
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

function shortId(value: string): string {
  if (value.length <= 14) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
