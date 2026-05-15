"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  CircleCheck,
  FileSearch,
  GitBranch,
  Link2,
  ListChecks,
  Scale,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "@/components/icons";
import {
  WalletAwareCaseReadiness,
  WalletUnavailableCaseReadiness,
} from "@/components/WalletAwareReadiness";
import Sidebar from "@/components/Sidebar";
import WalletConnectStatus from "@/components/WalletConnectStatus";
import Metric from "@/components/ui/Metric";
import Panel from "@/components/ui/Panel";
import {
  getMergedCommerceCases,
  submitStoredEvidence,
  verifyStoredCommerceCase,
} from "@/lib/lexnet-client-store";
import {
  buildCaseTimeline,
  buildEvidenceQualitySummary,
  buildVerificationSummary,
} from "@/lib/lexnet-domain";
import { buildGenLayerExecutionViewModel } from "@/lib/genlayer-execution";
import {
  getLexNetContractReadiness,
  type LexNetContractEnvironment,
} from "@/lib/lexnet-contract";
import type { CommerceCase } from "@/lib/lexnet-types";
import type { GenLayerExecutionRecord } from "@/lib/platform/types";

export default function CaseDetailClient({
  caseId,
  seedCase,
  contractEnvironment,
}: {
  caseId: string;
  seedCase: CommerceCase | null;
  contractEnvironment: LexNetContractEnvironment;
}) {
  const seedCases = useMemo(() => (seedCase ? [seedCase] : []), [seedCase]);
  const [commerceCase, setCommerceCase] = useState<CommerceCase | null>(seedCase);
  const [evidenceInput, setEvidenceInput] = useState("");
  const [message, setMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [genLayerExecution, setGenLayerExecution] =
    useState<GenLayerExecutionRecord | null>(null);
  const [isSubmittingGenLayer, setIsSubmittingGenLayer] = useState(false);
  const [isCheckingGenLayer, setIsCheckingGenLayer] = useState(false);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const mergedCase =
      getMergedCommerceCases(seedCases).find((candidate) => candidate.id === caseId) ??
      null;
    setCommerceCase(mergedCase);
    setIsHydrated(true);
  }, [caseId, seedCases]);

  function handleSubmitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const urls = evidenceInput
      .split(/\r?\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);

    const updatedCase = submitStoredEvidence(
      seedCases,
      window.localStorage,
      caseId,
      urls
    );

    if (!updatedCase) {
      setMessage("Case not found.");
      return;
    }

    setCommerceCase(updatedCase);
    setEvidenceInput("");
    setMessage(`Added ${updatedCase.evidence.length} evidence item(s).`);
  }

  async function handleVerifyCase() {
    setMessage("");
    setIsVerifying(true);

    const updatedCase = await verifyStoredCommerceCase(
      seedCases,
      window.localStorage,
      caseId
    );

    setIsVerifying(false);

    if (!updatedCase) {
      setMessage("Case not found.");
      return;
    }

    setCommerceCase(updatedCase);
    setMessage("Local AI recommendation report generated.");
  }

  async function submitGenLayerVerification() {
    if (!commerceCase) {
      return;
    }

    setMessage("");
    setIsSubmittingGenLayer(true);
    const response = await fetch("/api/genlayer/verify-case", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lexnet-operator-id": "operator-demo",
      },
      body: JSON.stringify({
        caseId: commerceCase.id,
        walletConnected: isConnected,
        connectedWalletAddress: address,
      }),
    });
    const payload = await response.json();
    setIsSubmittingGenLayer(false);

    if (payload.execution) {
      setGenLayerExecution(payload.execution);
    }
    setMessage(
      response.ok
        ? "GenLayer verification submitted. Contract state proof is pending."
        : payload.error ?? "GenLayer verification submission failed.",
    );
  }

  async function checkGenLayerState() {
    if (!commerceCase) {
      return;
    }

    setMessage("");
    setIsCheckingGenLayer(true);
    const response = await fetch(`/api/genlayer/cases/${commerceCase.id}`, {
      headers: {
        "x-lexnet-operator-id": "operator-demo",
        "x-lexnet-wallet-connected": String(isConnected),
        ...(address ? { "x-lexnet-wallet-address": address } : {}),
      },
    });
    const payload = await response.json();
    setIsCheckingGenLayer(false);

    if (payload.execution) {
      setGenLayerExecution(payload.execution);
    }
    setMessage(
      response.ok
        ? payload.stateVerified
          ? "GenLayer contract state contains a verification report."
          : "GenLayer contract state is readable, but proof is still pending."
        : payload.error ?? "GenLayer state check failed.",
    );
  }

  if (!commerceCase && isHydrated) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-shell">
          <div className="content-frame">
            <Link href="/" className="btn-secondary">
              <ArrowLeft size={15} strokeWidth={1.75} />
              Cases
            </Link>
            <section className="panel" style={{ marginTop: 18 }}>
              <h1 style={{ color: "var(--ink)", fontSize: 26, fontWeight: 800 }}>
                Case not found
              </h1>
              <p className="muted" style={{ marginTop: 8 }}>
                This browser does not have a local case matching `{caseId}`.
              </p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  if (!commerceCase) {
    return null;
  }

  const summary = buildVerificationSummary(commerceCase);
  const report = commerceCase.verificationReport;
  const riskFlags = report?.riskFlags ?? [];
  const timeline = buildCaseTimeline(commerceCase);
  const evidenceQuality = buildEvidenceQualitySummary(commerceCase);
  const contractReadiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_GENLAYER_RPC_URL: contractEnvironment.rpcUrl,
      NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: contractEnvironment.networkLabel,
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: contractEnvironment.contractAddress ?? undefined,
    },
    walletConnected: true,
  });
  const genLayerView = buildGenLayerExecutionViewModel(
    genLayerExecution,
    contractReadiness.isReady,
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame">
          <header className="topbar hero-panel">
            <div>
              <Link href="/" className="btn-quiet" style={{ marginBottom: 8 }}>
                <ArrowLeft size={15} strokeWidth={1.75} />
                Trust Case Queue
              </Link>
              <div className="section-label mono">{commerceCase.id}</div>
              <h1 className="topbar-title">{commerceCase.title}</h1>
              <p className="topbar-subtitle">{commerceCase.agreementText}</p>
            </div>
            <div className="topbar-actions">
              <span className="status-chip info">
                {commerceCase.status.replaceAll("_", " ")}
              </span>
              <WalletConnectStatus />
              <button
                type="button"
                onClick={handleVerifyCase}
                disabled={isVerifying}
                className="btn-primary"
              >
                <ScanSearch size={15} strokeWidth={1.75} />
                {isVerifying ? "Reviewing Locally" : "Run Local Review"}
              </button>
            </div>
          </header>

          <section className="panel hero-panel" style={{ marginBottom: 18, display: "grid", gap: 12 }}>
            <div className="section-label">
              <ListChecks size={14} strokeWidth={1.75} />
              Operator Brief
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              This case is part of the local command-center workflow. LexNet can summarize evidence,
              produce an AI recommendation, and track proof state, but it does not custody
              funds, execute payouts, or finalize settlement.
            </p>
            <div className="inspector-list">
              <InspectorRow label="Current status" value={commerceCase.status.replaceAll("_", " ")} />
              <InspectorRow label="Evidence quality" value={evidenceQuality.qualityLabel} />
              <InspectorRow label="Next operator action" value={summary.nextAction} />
            </div>
          </section>

          <div className="two-column workspace-shell">
            <div style={{ display: "grid", gap: 16 }}>
              <Panel title="Agreement" icon={<Scale size={15} strokeWidth={1.75} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Metric label="Buyer" value={commerceCase.buyer} mono />
                  <Metric label="Seller" value={commerceCase.seller} mono />
                  <Metric
                    label="Referenced Value"
                    value={`$${commerceCase.amountReference.toLocaleString()}`}
                  />
                  <Metric label="Created" value={commerceCase.createdAt.slice(0, 10)} />
                </div>
              </Panel>

              <Panel title="Case Timeline" icon={<ListChecks size={15} strokeWidth={1.75} />}>
                <div className="case-timeline">
                  {timeline.map((item) => (
                    <div key={item.label} className={`timeline-item ${item.status}`}>
                      <span />
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Acceptance Criteria" icon={<CircleCheck size={15} strokeWidth={1.75} />}>
                <div style={{ display: "grid", gap: 8 }}>
                  {commerceCase.acceptanceCriteria.map((criterion) => (
                    <div key={criterion} className="inspector-row">
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <CircleCheck size={15} color="var(--teal)" strokeWidth={1.75} />
                        <span style={{ color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.45 }}>
                          {criterion}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Evidence" icon={<FileSearch size={15} strokeWidth={1.75} />}>
                {commerceCase.evidence.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>
                    No delivery evidence has been submitted yet.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 9 }}>
                    {commerceCase.evidence.map((item) => (
                      <a
                        key={item.checksum}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="evidence-row"
                      >
                        <FileSearch
                          size={16}
                          color="var(--teal)"
                          strokeWidth={1.75}
                          style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              color: "var(--ink)",
                              fontSize: 13,
                              fontWeight: 800,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.url}
                          </span>
                          <span className="muted mono" style={{ display: "block", marginTop: 4, fontSize: 11 }}>
                            {item.resourceType} / {item.checksum}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Evidence Provenance" icon={<GitBranch size={15} strokeWidth={1.75} />}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  <Metric label="Quality" value={evidenceQuality.qualityLabel} />
                  <Metric label="Total Items" value={evidenceQuality.totalItems.toString()} />
                  <Metric label="Documents" value={evidenceQuality.documentItems.toString()} />
                  <Metric label="Repositories" value={evidenceQuality.repositoryItems.toString()} />
                </div>
              </Panel>

              <Panel title="Submit Evidence" icon={<Link2 size={15} strokeWidth={1.75} />}>
                <form onSubmit={handleSubmitEvidence} style={{ display: "grid", gap: 12 }}>
                  <textarea
                    className="lexnet-input"
                    value={evidenceInput}
                    onChange={(event) => setEvidenceInput(event.target.value)}
                    placeholder={"https://example.com/delivery-proof\nhttps://github.com/vendor/source"}
                    rows={4}
                  />
                  <button type="submit" className="btn-secondary" style={{ width: "fit-content" }}>
                    Add Evidence
                  </button>
                </form>
              </Panel>
            </div>

            <aside className="inspector action-rail">
              <div>
                <div className="section-label">
                  <Sparkles size={14} strokeWidth={1.75} />
                  AI Verdict
                </div>
                <div className="insight-card" style={{ marginTop: 12 }}>
                  <div style={{ color: "var(--ink)", fontSize: 28, fontWeight: 800 }}>
                    {summary.scoreLabel}
                  </div>
                  <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                    {summary.label}
                  </div>
                </div>
              </div>

              <div className="panel review-panel" style={{ display: "grid", gap: 10 }}>
                <div className="section-label">Verification Report</div>
                <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
                  {report?.summary ?? "No verification report has been generated yet."}
                </p>
                <div className="inspector-list">
                  <Metric label="Source" value={report?.source ?? "pending"} />
                  <Metric label="Reviewed" value={report?.reviewedAt.slice(0, 10) ?? "pending"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Metric label="Seller Share" value={summary.sellerShareLabel} />
                <Metric label="Next Action" value={summary.nextAction} />
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

              <div className="insight-card">
                <div className="section-label">
                  <ShieldCheck size={14} strokeWidth={1.75} />
                  Settlement Recommendation
                </div>
                <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.6 }}>
                  {report?.recommendation ??
                    "Run verification after evidence is submitted to produce a local recommendation."}
                </p>
              </div>

              {process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? (
                <WalletAwareCaseReadiness
                  commerceCase={commerceCase}
                  evidenceInput={evidenceInput}
                  contractEnvironment={contractEnvironment}
                  onCopy={setMessage}
                />
              ) : (
                <WalletUnavailableCaseReadiness
                  commerceCase={commerceCase}
                  evidenceInput={evidenceInput}
                  contractEnvironment={contractEnvironment}
                  onCopy={setMessage}
                />
              )}

              <div className="panel review-panel" style={{ display: "grid", gap: 10 }}>
                <div className="section-label">
                  <ShieldCheck size={14} strokeWidth={1.75} />
                  GenLayer Execution Proof
                </div>
                <span className={`status-chip ${genLayerView.tone === "danger" ? "danger" : genLayerView.tone === "success" ? "success" : "info"}`}>
                  {genLayerView.label}
                </span>
                <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
                  {genLayerView.description}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!genLayerView.canSubmit || isSubmittingGenLayer}
                    onClick={submitGenLayerVerification}
                  >
                    {isSubmittingGenLayer ? "Submitting" : "Submit verify_case"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!genLayerView.canCheckState || isCheckingGenLayer}
                    onClick={checkGenLayerState}
                  >
                    {isCheckingGenLayer ? "Checking" : "Check contract state"}
                  </button>
                </div>
              </div>

              {message ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "var(--blue-soft)",
                    border: "1px solid rgba(37,99,235,0.18)",
                    color: "var(--blue)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {message}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

