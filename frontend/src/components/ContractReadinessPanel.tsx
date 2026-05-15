"use client";

import { AlertTriangle, CheckCircle2, RadioTower, WalletCards } from "@/components/icons";
import type { LexNetContractReadiness } from "@/lib/lexnet-contract";

export default function ContractReadinessPanel({
  readiness,
  compact = false,
}: {
  readiness: LexNetContractReadiness;
  compact?: boolean;
}) {
  const contractLabel = readiness.contractAddress ?? "Not configured";
  const statusClass = readiness.isReady ? "success" : readiness.hasContractAddress ? "info" : "warning";

  return (
    <section className="panel" style={{ display: "grid", gap: 14, background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="section-label">
            <RadioTower size={14} strokeWidth={1.75} />
            GenLayer Readiness
          </div>
          <p className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
            Local verification remains the active demo path. Contract execution is guarded until every readiness check passes.
          </p>
        </div>
        <span className={`status-chip ${statusClass}`}>{readiness.modeLabel}</span>
      </div>

      <div className="inspector-list">
        <ReadinessRow
          label="Contract"
          value={contractLabel}
          ready={readiness.hasContractAddress}
          mono={Boolean(readiness.contractAddress)}
        />
        {!compact ? (
          <>
            <ReadinessRow label="Network" value={readiness.networkLabel} ready />
            <ReadinessRow label="RPC" value={readiness.rpcUrl} ready={readiness.hasRpcUrl} mono />
          </>
        ) : null}
        <ReadinessRow
          label="Wallet"
          value={readiness.walletConnected ? "Connected" : "Not connected"}
          ready={readiness.walletConnected}
        />
      </div>

      {readiness.blockingReasons.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {readiness.blockingReasons.map((reason) => (
            <span key={reason} className="risk-chip">
              <AlertTriangle size={14} strokeWidth={1.75} />
              {reason}
            </span>
          ))}
        </div>
      ) : (
        <span className="status-chip success" style={{ width: "fit-content" }}>
          <CheckCircle2 size={13} strokeWidth={1.75} />
          Ready for guarded contract execution
        </span>
      )}

      <div
        style={{
          display: "grid",
          gap: 8,
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface-subtle)",
        }}
      >
        <div className="section-label">
          <WalletCards size={14} strokeWidth={1.75} />
          Operation Flow
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
          1. Connect wallet with a WalletConnect project ID. 2. Confirm the contract,
          RPC, and wallet checks. 3. Copy or trigger the generated GenLayer payload.
        </p>
      </div>

      <button type="button" className="btn-secondary" disabled title="Direct GenLayer writes are enabled after all readiness checks pass.">
        <WalletCards size={15} strokeWidth={1.75} />
        Trigger GenLayer Write
      </button>
    </section>
  );
}

function ReadinessRow({
  label,
  value,
  ready,
  mono,
}: {
  label: string;
  value: string;
  ready: boolean;
  mono?: boolean;
}) {
  return (
    <div className="inspector-row">
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>{label}</span>
      <span
        className={mono ? "mono" : ""}
        style={{
          minWidth: 0,
          color: ready ? "var(--ink)" : "var(--red)",
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
