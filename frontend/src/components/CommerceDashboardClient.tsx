"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  CircleCheck,
  Database,
  FileSearch,
  IdCard,
  Inbox,
  RadioTower,
  Search,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from "@/components/icons";
import Sidebar from "@/components/Sidebar";
import WalletConnectStatus from "@/components/WalletConnectStatus";
import StatusChip from "@/components/ui/StatusChip";
import { getMergedCommerceCases } from "@/lib/lexnet-client-store";
import {
  buildCommandCenterMetrics,
  buildCommandCenterSignals,
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

  const metrics = useMemo(() => buildCommandCenterMetrics(cases), [cases]);
  const signals = useMemo(
    () => buildCommandCenterSignals(cases, { platformSummary, queueItems }),
    [cases, platformSummary, queueItems],
  );
  const highPriorityReviews = useMemo(() => buildHighPriorityReviews(cases), [cases]);
  const queueByCaseId = useMemo(
    () => new Map(queueItems.map((item) => [item.caseId, item])),
    [queueItems],
  );
  const filteredCases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cases.filter((commerceCase) => {
      const matchesSearch =
        !normalizedSearch ||
        [commerceCase.id, commerceCase.title, commerceCase.buyer, commerceCase.seller, commerceCase.agreementText]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      if (!matchesSearch) return false;

      if (filter === "active") {
        return ["ACTIVE", "EVIDENCE_SUBMITTED", "UNDER_AI_REVIEW"].includes(commerceCase.status);
      }
      if (filter === "needs-review") {
        return ["REVISION_REQUESTED", "DISPUTED", "SETTLEMENT_RECOMMENDED"].includes(commerceCase.status);
      }
      if (filter === "verified") {
        return commerceCase.status === "VERIFIED";
      }
      return true;
    });
  }, [cases, filter, search]);

  const selectedCase = filteredCases[0] ?? cases[0] ?? null;
  const runtimeLabel = runtimeMode === "contract-configured" ? "StudioNet Contract Ready" : "StudioNet Workspace";
  const storeMode = platformSummary ? "platform store online" : "seed fallback";
  const contractStateReady = Boolean(contractEnvironment.rpcUrl && contractEnvironment.contractAddress);

  return (
    <div className="app-shell command-center-page">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame command-center-frame">
          <header className="command-topbar">
            <label className="command-search">
              <Search size={16} strokeWidth={1.75} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cases, wallets, agreements, evidence..." />
            </label>
            <div className="command-actions">
              <span className={`status-chip ${signals.blockedQueueItems > 0 ? "warning" : "success"}`}>
                {signals.blockedQueueItems > 0
                  ? `${signals.blockedQueueItems} blocked queue items`
                  : "No blocked queue items"}
              </span>
              <span className="status-chip info">{runtimeLabel}</span>
              <WalletConnectStatus />
              <Link href="/cases/new" className="btn-primary">
                New Case
                <ArrowUpRight size={15} strokeWidth={1.75} />
              </Link>
            </div>
          </header>

          <section className="command-hero">
            <div className="command-hero-main">
              <div className="section-label"><Inbox size={14} strokeWidth={1.75} />Operator Command Center</div>
              <h1>Trust operations with every signal in reach.</h1>
              <p>
                Live case, queue, passport, audit, and readiness signals from the LexNet platform store. Review evidence, verify recommendations, and publish privacy-safe trust records without implying custody or payout execution.
              </p>
              <div className="command-signal-strip">
                <SignalCard label="Active cases" value={signals.activeCases.toLocaleString()} />
                <SignalCard label="AI reviewed" value={signals.reviewedCases.toLocaleString()} />
                <SignalCard label="Evidence items" value={signals.evidenceItems.toLocaleString()} />
                <SignalCard label="Readiness" value={`${signals.readinessPercent}%`} />
              </div>
            </div>
            <aside className="command-radar-panel">
              <div className="section-label"><RadioTower size={14} strokeWidth={1.75} />State verification</div>
              <h2>{contractStateReady ? `${contractEnvironment.networkLabel} ready` : "Verification guarded"}</h2>
              <p>{contractStateReady ? "RPC and contract address are configured for operator verification." : "Contract execution remains guarded until RPC and contract settings are complete."}</p>
              <ReadinessPulse percent={signals.readinessPercent} />
            </aside>
          </section>

          <section className="command-metric-grid">
            <MetricCard icon={<ShieldCheck size={18} />} label="Reviewed Value" value={`$${metrics.protectedValue.toLocaleString()}`} detail={storeMode} />
            <MetricCard icon={<Activity size={18} />} label="Queue Items" value={signals.queueCount.toLocaleString()} detail={`${signals.blockedQueueItems} blocked`} />
            <MetricCard icon={<BadgeCheck size={18} />} label="Recommendation Ready" value={metrics.settlementReadyCases.toLocaleString()} detail="operator decision pending" />
            <MetricCard icon={<IdCard size={18} />} label="Published Passports" value={signals.publishedPassportCount.toLocaleString()} detail={`${signals.auditEventCount} audit events`} />
          </section>

          <section className="command-workspace">
            <div className="command-case-panel">
              <div className="command-panel-head">
                <div><div className="section-label">Case queue</div><h2>{filteredCases.length} visible case records</h2></div>
                <div className="segmented">
                  {filters.map((item) => (
                    <button key={item.value} type="button" className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>
                  ))}
                </div>
              </div>
              <div className="queue-table-wrap command-table-wrap">
                <table className="queue-table command-table">
                  <thead><tr><th>Case</th><th>Status</th><th>Queue</th><th>Evidence</th><th>Value</th><th>Next</th></tr></thead>
                  <tbody>
                    {filteredCases.map((commerceCase) => {
                      const summary = buildVerificationSummary(commerceCase);
                      const queueItem = queueByCaseId.get(commerceCase.id);
                      return (
                        <tr key={commerceCase.id}>
                          <td><Link href={`/cases/${commerceCase.id}`} className="command-case-link"><span>{commerceCase.title}</span><small>{shortId(commerceCase.buyer)} &rarr; {shortId(commerceCase.seller)}</small></Link></td>
                          <td><StatusChip status={commerceCase.status} /></td>
                          <td>{queueItem ? <QueueBadge item={queueItem} /> : <span className="command-muted">unqueued</span>}</td>
                          <td>{commerceCase.evidence.length}</td>
                          <td>${commerceCase.amountReference.toLocaleString()}</td>
                          <td>{summary.nextAction}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="command-side-stack">
              <QueueRail cases={cases} queueItems={queueItems} />
              {selectedCase ? <CaseInspector commerceCase={selectedCase} /> : null}
            </aside>
          </section>

          <section className="command-activity-row">
            <div className="command-activity-card">
              <div className="section-label"><FileSearch size={14} strokeWidth={1.75} />Priority review lane</div>
              <div className="command-review-list">
                {highPriorityReviews.map((review) => (
                  <Link key={review.caseId} href={`/cases/${review.caseId}`} className="command-review-item">
                    <strong>{review.title}</strong><span>{review.priorityReason}</span><small>{review.scoreLabel} - ${review.amountReference.toLocaleString()}</small>
                  </Link>
                ))}
              </div>
            </div>
            <div className="command-activity-card">
              <div className="section-label"><Database size={14} strokeWidth={1.75} />Platform data coverage</div>
              <div className="command-coverage-grid">
                <SignalCard label="Workspaces" value={(platformSummary?.workspaceCount ?? 0).toLocaleString()} />
                <SignalCard label="Operators" value={(platformSummary?.operatorCount ?? 0).toLocaleString()} />
                <SignalCard label="Cases" value={(platformSummary?.caseCount ?? cases.length).toLocaleString()} />
                <SignalCard label="Audit events" value={signals.auditEventCount.toLocaleString()} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="command-metric-card"><div className="command-metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function SignalCard({ label, value }: { label: string; value: string }) {
  return <div className="command-signal-card"><span>{label}</span><strong>{value}</strong></div>;
}

function QueueRail({ cases, queueItems }: { cases: CommerceCase[]; queueItems: DashboardQueueItem[] }) {
  const casesById = new Map(cases.map((commerceCase) => [commerceCase.id, commerceCase]));
  const visibleQueue = queueItems.slice(0, 4);
  return (
    <div className="command-rail-card">
      <div className="command-panel-head compact"><div><div className="section-label">Operator queue</div><h2>{queueItems.length} work items</h2></div></div>
      <div className="command-queue-list">
        {visibleQueue.length > 0 ? visibleQueue.map((item) => {
          const commerceCase = casesById.get(item.caseId);
          return <Link key={item.id} href={`/cases/${item.caseId}`} className="command-queue-item"><strong>{commerceCase?.title ?? item.caseId}</strong><span>{formatQueueStatus(item.status)} - {formatQueuePriority(item.priority)}</span></Link>;
        }) : <span className="command-muted">No queue items from the platform store.</span>}
      </div>
    </div>
  );
}

function CaseInspector({ commerceCase }: { commerceCase: CommerceCase }) {
  const summary = buildVerificationSummary(commerceCase);
  const riskFlags = commerceCase.verificationReport?.riskFlags ?? [];
  return (
    <div className="command-rail-card">
      <div className="section-label"><WalletCards size={14} strokeWidth={1.75} />Selected case</div>
      <h2 className="command-inspector-title">{commerceCase.title}</h2>
      <p>{commerceCase.agreementText}</p>
      <div className="command-inspector-grid">
        <SignalCard label="Evidence" value={commerceCase.evidence.length.toLocaleString()} />
        <SignalCard label="Score" value={summary.scoreLabel} />
        <SignalCard label="Value" value={`$${commerceCase.amountReference.toLocaleString()}`} />
        <SignalCard label="Verdict" value={summary.label} />
      </div>
      <div className="command-risk-list">
        {riskFlags.length > 0 ? riskFlags.map((flag) => <span key={flag} className="risk-chip"><TriangleAlert size={14} strokeWidth={1.75} />{flag}</span>) : <span className="status-chip success"><CircleCheck size={13} strokeWidth={1.75} />No active risk flags</span>}
      </div>
      <Link href={`/cases/${commerceCase.id}`} className="btn-secondary">Open case file<ArrowUpRight size={15} strokeWidth={1.75} /></Link>
    </div>
  );
}

function ReadinessPulse({ percent }: { percent: number }) {
  return <div className="command-pulse-wrap" aria-label={`Readiness ${percent}%`}><div className="command-pulse-ring" /><div className="command-pulse-core"><strong>{percent}%</strong><span>coverage</span></div></div>;
}

function QueueBadge({ item }: { item: DashboardQueueItem }) {
  return <span className={`command-queue-badge ${item.status === "blocked" ? "blocked" : item.priority === "high" ? "high" : ""}`}>{formatQueueStatus(item.status)}</span>;
}

function formatQueueStatus(status: DashboardQueueItem["status"]): string {
  return status.replaceAll("_", " ");
}

function formatQueuePriority(priority: DashboardQueueItem["priority"]): string {
  return priority[0].toUpperCase() + priority.slice(1);
}

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
