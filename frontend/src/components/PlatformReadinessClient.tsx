"use client";

import {
  Activity,
  CircleCheck,
  Database,
  Eye,
  RadioTower,
  ShieldCheck,
  TriangleAlert,
} from "@/components/icons";
import Sidebar from "@/components/Sidebar";
import WalletConnectStatus from "@/components/WalletConnectStatus";
import type { PlatformObservabilityStatus } from "@/lib/platform/observability";
import type { PlatformReadinessStatus } from "@/lib/platform/readiness";

export default function PlatformReadinessClient({
  readiness,
  observability,
}: {
  readiness: PlatformReadinessStatus;
  observability: PlatformObservabilityStatus;
}) {
  const productionReady = readiness.productionBlockers.length === 0;
  const isProductionMode = readiness.runtimeMode === "production";
  const readinessLabel = isProductionMode
    ? productionReady
      ? "Production checks clear"
      : `${readiness.productionBlockers.length} production blockers`
    : "Local demo checks only";
  const readinessTone = isProductionMode && !productionReady ? "warning" : isProductionMode ? "success" : "info";

  return (
    <div className="app-shell platform-control-page command-center-page">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame">
          <header className="topbar hero-panel platform-hero">
            <div>
              <div className="section-label">
                <ShieldCheck size={14} strokeWidth={1.75} />
                Platform Control Plane
              </div>
              <h1 className="topbar-title">Production Readiness</h1>
              <p className="topbar-subtitle">
                Inspect auth, persistence, evidence policy, GenLayer readiness, and redacted observability before promoting LexNet beyond local review mode.
              </p>
            </div>
            <div className="topbar-actions">
              <span className={`status-chip ${readinessTone}`}>{readinessLabel}</span>
              <span className="status-chip info">{readiness.runtimeMode}</span>
              <WalletConnectStatus />
            </div>
          </header>

          <section className="metric-grid" style={{ marginBottom: 18 }}>
            <ReadinessMetric
              icon={<TriangleAlert size={18} strokeWidth={1.75} />}
              label="Production Blockers"
              value={observability.productionBlockerCount.toLocaleString()}
              tone={observability.productionBlockerCount === 0 ? "success" : "warning"}
            />
            <ReadinessMetric
              icon={<Activity size={18} strokeWidth={1.75} />}
              label="Readiness Reasons"
              value={observability.readinessBlockingReasonCount.toLocaleString()}
              tone={observability.readinessBlockingReasonCount === 0 ? "success" : "warning"}
            />
            <ReadinessMetric
              icon={<Eye size={18} strokeWidth={1.75} />}
              label="Audit Events"
              value={observability.auditEventCount.toLocaleString()}
              tone="info"
            />
            <ReadinessMetric
              icon={<Database size={18} strokeWidth={1.75} />}
              label="Store Mode"
              value={readiness.storeMode}
              tone={readiness.storeMode === "managed" ? "success" : "info"}
            />
          </section>

          <section className="readiness-grid">
            <div style={{ display: "grid", gap: 18 }}>
              <ReadinessSection
                icon={<ShieldCheck size={14} strokeWidth={1.75} />}
                title="Production Auth"
                statusLabel={readiness.auth.productionAuthEnforced ? "Enforced" : "Not enforced"}
                statusTone={readiness.auth.productionAuthEnforced ? "success" : "warning"}
                rows={[
                  ["Configured", readiness.auth.productionAuthConfigured],
                  ["Enforced", readiness.auth.productionAuthEnforced],
                  ["Mode", readiness.auth.productionAuthMode ?? "Not enforced"],
                  ["Demo API enabled", readiness.auth.demoPrivateApiEnabled],
                  ["Mutating routes", readiness.auth.mutatingRoutesAllowed ? "Allowed" : "Blocked"],
                ]}
                blockingReasons={readiness.auth.blockingReasons}
              />

              <ReadinessSection
                icon={<Database size={14} strokeWidth={1.75} />}
                title="Managed Persistence"
                statusLabel={readiness.persistence.managedPersistenceEnforced ? "Managed" : readiness.persistence.mode}
                statusTone={readiness.persistence.managedPersistenceEnforced ? "success" : "warning"}
                rows={[
                  ["Mode", readiness.persistence.mode],
                  ["Filesystem allowed", readiness.persistence.filesystemPersistenceAllowed],
                  ["Provider configured", readiness.persistence.managedPersistenceProviderConfigured],
                  ["Database URL configured", readiness.persistence.managedDatabaseUrlConfigured],
                  ["Enforced", readiness.persistence.managedPersistenceEnforced],
                ]}
                blockingReasons={readiness.persistence.blockingReasons}
              />
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <ReadinessSection
                icon={<Eye size={14} strokeWidth={1.75} />}
                title="Evidence Policy"
                statusLabel={readiness.evidencePolicy.retentionPolicyConfigured ? "Metadata retention" : "Retention missing"}
                statusTone={readiness.evidencePolicy.retentionPolicyConfigured ? "success" : "warning"}
                rows={[
                  ["Public HTTPS only", readiness.evidencePolicy.allowPublicHttpsOnly],
                  ["Raw evidence storage", readiness.evidencePolicy.rawEvidenceStorage],
                  ["Retention configured", readiness.evidencePolicy.retentionPolicyConfigured],
                  ["Private hosts blocked", readiness.evidencePolicy.blockedPrivateNetworkHosts],
                ]}
                blockingReasons={readiness.evidencePolicy.blockingReasons}
              />

              <ReadinessSection
                icon={<RadioTower size={14} strokeWidth={1.75} />}
                title="GenLayer Readiness"
                statusLabel={readiness.genLayer.stateVerificationCapable ? "State verification ready" : "Readiness incomplete"}
                statusTone={readiness.genLayer.stateVerificationCapable ? "success" : "warning"}
                rows={[
                  ["RPC configured", readiness.genLayer.rpcUrlConfigured],
                  ["Contract configured", readiness.genLayer.contractAddressConfigured],
                  ["WalletConnect configured", readiness.genLayer.walletConnectProjectIdConfigured],
                  ["State verification", readiness.genLayer.stateVerificationCapable],
                  ["Network", readiness.genLayer.networkLabel],
                ]}
                blockingReasons={readiness.genLayer.blockingReasons}
              />
            </div>
          </section>

          <section className="panel hero-panel" style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div className="section-label">
                  <Activity size={14} strokeWidth={1.75} />
                  Redacted Observability
                </div>
                <p className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                  This view exposes counts, booleans, and safe labels only. It does not expose secrets, database URLs, raw audit details, evidence URLs, private operators, payout status, or settlement finality claims.
                </p>
              </div>
              <span className="status-chip info">{observability.runtimeMode}</span>
            </div>
            <div className="inspector-list" style={{ marginTop: 14 }}>
              <ReadinessRow label="Latest audit event" value={observability.latestAuditEventType ?? "None"} />
              <ReadinessRow label="Latest audit time" value={observability.latestAuditEventAt ?? "None"} />
              <ReadinessRow label="Auth enforced" value={formatValue(observability.productionAuthEnforced)} />
              <ReadinessRow label="Persistence enforced" value={formatValue(observability.managedPersistenceEnforced)} />
              <ReadinessRow label="Evidence retention" value={formatValue(observability.evidenceRetentionPolicyConfigured)} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ReadinessMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "warning" | "info";
}) {
  return (
    <div className="panel metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

function ReadinessSection({
  icon,
  title,
  statusLabel,
  statusTone,
  rows,
  blockingReasons,
}: {
  icon: React.ReactNode;
  title: string;
  statusLabel: string;
  statusTone: "success" | "warning" | "info";
  rows: Array<[string, string | boolean]>;
  blockingReasons: string[];
}) {
  return (
    <section className="panel" style={{ display: "grid", gap: 12 }}>
      <div className="readiness-section-head">
        <div className="section-label">
          {icon}
          {title}
        </div>
        <span className={`status-chip ${statusTone}`}>{statusLabel}</span>
      </div>
      <div className="readiness-rows">
        {rows.map(([label, value]) => (
          <ReadinessRow key={label} label={label} value={value} />
        ))}
      </div>
      {blockingReasons.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {blockingReasons.map((reason) => (
            <span key={reason} className="risk-chip">
              <TriangleAlert size={13} strokeWidth={1.75} />
              {reason}
            </span>
          ))}
        </div>
      ) : (
        <span className="status-chip success" style={{ width: "fit-content" }}>
          <CircleCheck size={12} strokeWidth={1.75} />
          No blockers
        </span>
      )}
    </section>
  );
}

function ReadinessRow({ label, value }: { label: string; value: string | boolean }) {
  const valueClass =
    typeof value === "boolean" ? (value ? "true" : "false") : "";
  const display = formatValue(value);
  return (
    <div className="readiness-row">
      <span className="readiness-row-label">{label}</span>
      <span className={`readiness-row-value ${valueClass}`}>{display}</span>
    </div>
  );
}

function formatValue(value: string | boolean): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return value;
}
