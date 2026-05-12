"use client";

import { Copy, LockKeyhole, RadioTower } from "lucide-react";
import type { LexNetContractCallPreview } from "@/lib/lexnet-contract";

export default function ContractCallPreview({
  preview,
  onCopy,
}: {
  preview: LexNetContractCallPreview;
  onCopy?: (message: string) => void;
}) {
  const payloadText = JSON.stringify(preview.payload, null, 2);

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      onCopy?.("Clipboard is unavailable in this browser.");
      return;
    }

    await navigator.clipboard.writeText(payloadText);
    onCopy?.(`${preview.method} payload copied for script-driven GenLayer demo.`);
  }

  return (
    <div className="panel" style={{ display: "grid", gap: 12, background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="section-label">
          <RadioTower size={14} strokeWidth={1.75} />
          Contract Call Preview
        </div>
        <span className={`status-chip ${preview.enabled ? "success" : "warning"}`}>
          {preview.enabled ? "Ready" : "Guarded"}
        </span>
      </div>

      <div className="inspector-list">
        <PreviewRow label="Method" value={preview.method} />
        <PreviewRow label="Contract" value={preview.contractAddress ?? "Not configured"} mono />
        <PreviewRow label="Network" value={preview.networkLabel} />
      </div>

      <pre
        style={{
          margin: 0,
          maxHeight: 180,
          overflow: "auto",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface-subtle)",
          padding: 12,
          color: "var(--ink-soft)",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {payloadText}
      </pre>

      <button type="button" className="btn-secondary" onClick={handleCopy} style={{ width: "fit-content" }}>
        <Copy size={15} strokeWidth={1.75} />
        Copy Payload
      </button>

      <div className="risk-chip" style={{ width: "fit-content" }}>
        <LockKeyhole size={14} strokeWidth={1.75} />
        UI direct writes stay guarded; local verification remains the fallback.
      </div>
    </div>
  );
}

function PreviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="inspector-row">
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>{label}</span>
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
