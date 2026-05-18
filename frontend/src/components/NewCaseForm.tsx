"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ArrowRight, FilePlus2, ShieldCheck, Scale, TriangleAlert } from "@/components/icons";
import { createStoredCommerceCase } from "@/lib/lexnet-client-store";
import type { CommerceCase } from "@/lib/lexnet-types";

export default function NewCaseForm({ seedCases }: { seedCases: CommerceCase[] }) {
  const router = useRouter();
  const { address: connectedWalletAddress, isConnected: walletConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [buyer, setBuyer] = useState("");
  const [seller, setSeller] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [amountReference, setAmountReference] = useState("0");
  const [error, setError] = useState("");
  const intakeStats = [
    { label: "Seed cases", value: seedCases.length.toLocaleString() },
    { label: "Flow", value: "Command center" },
    { label: "Output", value: "Review-ready case" },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const criteria = acceptanceCriteria
      .split("\n")
      .map((criterion) => criterion.trim())
      .filter(Boolean);
    const amount = Number(amountReference);

    if (!title.trim() || !buyer.trim() || !seller.trim()) {
      setError("Title, buyer, and seller are required.");
      return;
    }
    if (!agreementText.trim() || criteria.length === 0) {
      setError("Agreement text and at least one acceptance criterion are required.");
      return;
    }
    if (agreementText.trim().length < 40) {
      setError("Agreement text must be at least 40 characters.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Referenced value must be greater than zero.");
      return;
    }

    const commerceCase = createStoredCommerceCase(
      seedCases,
      window.localStorage,
      {
        title,
        buyer,
        seller,
        agreementText,
        acceptanceCriteria: criteria,
        amountReference: amount,
      }
    );

    // Fire-and-forget: submit to GenLayer contract
    fetch("/api/genlayer/create-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: commerceCase.id,
        title: commerceCase.title,
        seller: commerceCase.seller,
        agreementText: commerceCase.agreementText,
        acceptanceCriteria: commerceCase.acceptanceCriteria,
        amountReference: commerceCase.amountReference,
        walletConnected,
        connectedWalletAddress,
      }),
    }).catch((err) => {
      console.error("[LexNet] create_case contract write failed:", err);
    });

    router.push(`/cases/${commerceCase.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="panel review-panel" style={{ padding: 0, overflow: "hidden" }}>
      <div className="hero-panel" style={{ padding: 22, borderBottom: "1px solid var(--border)" }}>
        <div className="section-label">
          <FilePlus2 size={14} strokeWidth={1.75} />
          Case Intake
        </div>
        <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>
          Create a local commerce case that matches the audit workflow and can later wire to GenLayer writes.
        </div>
        <div className="surface-grid" style={{ marginTop: 16 }}>
          {intakeStats.map((item) => (
            <div key={item.label} className="insight-card">
              <span className="section-label">{item.label}</span>
              <strong style={{ color: "var(--ink)", fontSize: 18 }}>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 18, display: "grid", gap: 14 }}>
        <FormSection title="Parties" step="1" icon={<Scale size={14} strokeWidth={1.75} />}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Case title">
              <input
                className="lexnet-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Marketplace fulfillment verification"
              />
            </Field>
            <Field label="Referenced transaction value">
              <input
                className="lexnet-input"
                type="number"
                min="1"
                value={amountReference}
                onChange={(event) => setAmountReference(event.target.value)}
              />
            </Field>
            <Field label="Buyer account">
              <input
                className="lexnet-input"
                value={buyer}
                onChange={(event) => setBuyer(event.target.value)}
                placeholder="0xbuyer or business account"
              />
            </Field>
            <Field label="Seller account">
              <input
                className="lexnet-input"
                value={seller}
                onChange={(event) => setSeller(event.target.value)}
                placeholder="0xseller or vendor account"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Agreement" step="2" icon={<ShieldCheck size={14} strokeWidth={1.75} />}>
          <Field label="Agreement text">
            <textarea
              className="lexnet-input"
              value={agreementText}
              onChange={(event) => setAgreementText(event.target.value)}
              placeholder="Describe what the seller must deliver and what the buyer expects."
              rows={5}
            />
          </Field>
        </FormSection>

        <FormSection title="Acceptance Criteria" step="3" icon={<TriangleAlert size={14} strokeWidth={1.75} />}>
          <Field label="One criterion per line">
            <textarea
              className="lexnet-input"
              value={acceptanceCriteria}
              onChange={(event) => setAcceptanceCriteria(event.target.value)}
              placeholder={"Tracking page must show delivered status.\nReceipt must match the order reference."}
              rows={4}
            />
          </Field>
        </FormSection>

        {error ? (
          <div
            style={{
              border: "1px solid rgba(220,38,38,0.18)",
              background: "var(--red-soft)",
              color: "var(--red)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button type="submit" className="btn-primary">
            Create Case
            <ArrowRight size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </form>
  );
}

function FormSection({
  title,
  icon,
  step,
  children,
}: {
  title: string;
  icon: ReactNode;
  step: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="section-label">
          {icon}
          {title}
        </div>
        <span className="step-marker">{step}</span>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
