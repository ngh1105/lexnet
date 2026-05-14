# Pilot Command Center Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Phase F pilot walkthrough feel cohesive and demo-ready across dashboard, case detail, passports, and public passport pages.

**Architecture:** Keep the existing Next.js App Router and component structure. Add focused UI/copy polish inside current client components and rely on existing seeded `.lexnet-data` records, domain helpers, and demo-private API behavior. Avoid production infrastructure, custody/payment/finality claims, and broad refactors.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node `tsx --test`, existing CSS classes and Lucide icons.

---

## File Structure

- Modify `frontend/src/components/CommerceDashboardClient.tsx` — clarify the pilot command center story, safe metric labels, and walkthrough copy.
- Modify `frontend/src/components/CaseDetailClient.tsx` — add recommendation-only framing, proof/evidence/next-action context, and safer action copy.
- Modify `frontend/src/components/TrustPassportsClient.tsx` — clarify published backend vs local demo passport state and public preview meaning.
- Modify `frontend/src/components/PublicPassportClient.tsx` — make the public passport feel intentionally shareable while preserving privacy-safe aggregate-only wording.
- Modify `frontend/tests/platform.test.ts` only if implementation introduces reusable behavior that needs automated coverage.
- Do not modify production auth, persistence adapters, GenLayer SDK vendored code, dependencies, or `.lexnet-data/`.

## Task 1: Dashboard Pilot Story Polish

**Files:**
- Modify: `frontend/src/components/CommerceDashboardClient.tsx`

- [ ] **Step 1: Inspect current dashboard in browser**

Run:

```bash
npm --prefix frontend run pilot:prepare
npm --prefix frontend run demo:dev
```

Open `http://localhost:3002/`. Confirm the current dashboard shows the case queue, metrics, pipeline strip, priority reviews, backend store, operator queue, readiness panel, and evidence inspector.

- [ ] **Step 2: Update dashboard copy to recommendation-only language**

In `frontend/src/components/CommerceDashboardClient.tsx`, change the header subtitle from settlement-focused language to recommendation-only pilot language:

```tsx
<p className="topbar-subtitle">
  Prioritize commerce cases, inspect evidence, and review AI recommendations
  before an operator decides the next action.
</p>
```

Change metric labels:

```tsx
<MetricCard
  icon={<ShieldCheck size={18} strokeWidth={1.75} />}
  label="Reviewed Value"
  value={`$${commandMetrics.protectedValue.toLocaleString()}`}
/>
...
<MetricCard
  icon={<BadgeCheck size={18} strokeWidth={1.75} />}
  label="Recommendation Ready"
  value={commandMetrics.settlementReadyCases.toLocaleString()}
/>
```

- [ ] **Step 3: Strengthen the pilot walkthrough strip**

Replace the current pipeline heading and steps with operator-safe copy:

```tsx
<h2 style={{ marginTop: 8, color: "var(--ink)", fontSize: 20, fontWeight: 900 }}>
  Pilot walkthrough: evidence to recommendation to trust signal
</h2>
<p className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
  This local pilot shows review recommendations only. LexNet does not custody funds,
  release payouts, or claim settlement finality in this workflow.
</p>
```

Change the steps array to:

```tsx
{["Intake", "Evidence", "AI Review", "Operator Action", "Passport"].map((step, index) => (
  <div key={step} className="pipeline-step">
    <span>{index + 1}</span>
    {step}
  </div>
))}
```

- [ ] **Step 4: Add a compact operator outcome summary beside priority cards**

Inside the right-hand `<aside>` before `High Priority Reviews`, add a panel:

```tsx
<div className="panel" style={{ display: "grid", gap: 12 }}>
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
```

If `ListChecks` is not already imported, add it to the Lucide import list in the same file.

- [ ] **Step 5: Browser-check dashboard**

Open `/` and verify:
- Header no longer says settlement recommendations.
- Metric no longer says protected value or settlement ready.
- Walkthrough explicitly says recommendation-only and no custody/payout/finality.
- No console errors except normal dev-mode warnings.

- [ ] **Step 6: Commit dashboard polish**

Run:

```bash
git add frontend/src/components/CommerceDashboardClient.tsx
git commit -m "feat: clarify pilot dashboard story"
```

## Task 2: Case Detail Operator Context Polish

**Files:**
- Modify: `frontend/src/components/CaseDetailClient.tsx`

- [ ] **Step 1: Inspect case detail in browser**

Open `http://localhost:3002/cases/lx-case-demo-settlement`. Confirm visible agreement, status, local verification button, evidence, timeline, recommendation/proof panels, and no console errors.

- [ ] **Step 2: Add a recommendation-only operator brief near the case header**

In `CaseDetailClient.tsx`, after the closing `</header>` and before `<div className="two-column">`, insert:

```tsx
<section className="panel" style={{ marginBottom: 16, display: "grid", gap: 10 }}>
  <div className="section-label">
    <ListChecks size={14} strokeWidth={1.75} />
    Operator Brief
  </div>
  <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
    This case is part of the local pilot workflow. LexNet can summarize evidence,
    produce an AI recommendation, and track proof state, but it does not custody
    funds, execute payouts, or finalize settlement.
  </p>
  <div className="inspector-list">
    <InspectorRow label="Current status" value={commerceCase.status.replaceAll("_", " ")} />
    <InspectorRow label="Evidence quality" value={evidenceQuality.label} />
    <InspectorRow label="Next operator action" value={summary.nextAction} />
  </div>
</section>
```

`ListChecks` is already imported in this file. If `InspectorRow` is not available in this file, add a small local helper at the bottom:

```tsx
function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
```

- [ ] **Step 3: Make local verification button copy safer**

Change:

```tsx
{isVerifying ? "Verifying Locally" : "Run Local Verification"}
```

to:

```tsx
{isVerifying ? "Reviewing Locally" : "Run Local Review"}
```

Change the success message in `handleVerifyCase` from:

```tsx
setMessage("Local AI verification report generated.");
```

to:

```tsx
setMessage("Local AI recommendation report generated.");
```

- [ ] **Step 4: Browser-check case detail**

Open `/cases/lx-case-demo-settlement` and verify:
- Operator brief appears.
- Copy is recommendation-only.
- Local review button works if clicked.
- No console errors except normal dev-mode warnings.

- [ ] **Step 5: Commit case detail polish**

Run:

```bash
git add frontend/src/components/CaseDetailClient.tsx
git commit -m "feat: add pilot operator context to case detail"
```

## Task 3: Passport Operator Clarity Polish

**Files:**
- Modify: `frontend/src/components/TrustPassportsClient.tsx`

- [ ] **Step 1: Inspect passports page in browser**

Open `http://localhost:3002/passports`. Confirm backend records load through `/api/passports` with HTTP 200 and cards show published/public preview state.

- [ ] **Step 2: Update passports topbar copy**

Change topbar subtitle to:

```tsx
<p className="topbar-subtitle">
  Operator-managed trust summaries derived from reviewed commerce cases. Published
  records expose only privacy-safe aggregate signals.
</p>
```

- [ ] **Step 3: Add publication explainer panel**

After the action state message block and before the metric grid, add:

```tsx
<section className="panel" style={{ marginBottom: 16, display: "grid", gap: 10 }}>
  <div className="section-label">
    <ShieldCheck size={14} strokeWidth={1.75} />
    Publication Model
  </div>
  <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
    Backend passport records can be published into public previews. Local demo
    passports are derived from the pilot case set and need backend generation before
    publication controls apply. Public previews hide raw parties, evidence, case IDs,
    audit events, and workspace data.
  </p>
</section>
```

- [ ] **Step 4: Improve local-only card text**

Change:

```tsx
<span>Local demo passport. Generate backend records to enable publishing state.</span>
```

to:

```tsx
<span>Local demo passport derived from case history. Generate backend records before publishing a privacy-safe preview.</span>
```

- [ ] **Step 5: Browser-check passports page**

Open `/passports` and verify:
- Publication model panel appears.
- Backend/public preview language is clear.
- `/api/passports` returns 200.
- No console errors except normal dev-mode warnings.

- [ ] **Step 6: Commit passport polish**

Run:

```bash
git add frontend/src/components/TrustPassportsClient.tsx
git commit -m "feat: clarify pilot passport publication model"
```

## Task 4: Public Passport Shareable Context Polish

**Files:**
- Modify: `frontend/src/components/PublicPassportClient.tsx`

- [ ] **Step 1: Inspect public passport in browser**

Open `http://localhost:3002/passport/buyer-0x4f9a-lexnet-d86156e8`. Confirm it displays aggregate metrics and redacted party label only.

- [ ] **Step 2: Add shareable trust signal framing**

In the summary panel, after the paragraph that starts `LexNet publishes aggregate trust passport data`, add:

```tsx
<p className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>
  Treat this page as a shareable trust signal, not a payment, custody, or final
  settlement record.
</p>
```

- [ ] **Step 3: Add privacy boundary chips**

After the risk flag block and before the final updated-at line, add:

```tsx
<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
  {[
    "No raw evidence",
    "No private case IDs",
    "No workspace data",
    "No payout status",
  ].map((item) => (
    <span key={item} className="status-chip info">
      {item}
    </span>
  ))}
</div>
```

- [ ] **Step 4: Browser-check public passport**

Open `/passport/buyer-0x4f9a-lexnet-d86156e8` and verify:
- Page still shows only redacted subject and aggregate metrics.
- Privacy boundary chips appear.
- No raw parties, evidence URLs, case IDs, audit events, or workspace data are visible.
- No console errors except normal dev-mode warnings.

- [ ] **Step 5: Commit public passport polish**

Run:

```bash
git add frontend/src/components/PublicPassportClient.tsx
git commit -m "feat: frame public passports as privacy-safe trust signals"
```

## Task 5: Final Verification And Handoff

**Files:**
- No source modifications unless verification exposes a regression.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm --prefix frontend run test:domain
npm --prefix frontend run test:platform
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
npm --prefix frontend run pilot:check
```

Expected:
- Domain tests pass.
- Platform tests pass.
- Typecheck exits 0.
- Build compiles successfully.
- Pilot check exits 0 with `.lexnet-data git ignore status: ignored`.

- [ ] **Step 2: Run browser walkthrough**

Run:

```bash
npm --prefix frontend run demo:dev
```

Open and check:
- `http://localhost:3002/`
- `http://localhost:3002/cases/lx-case-demo-settlement`
- `http://localhost:3002/passports`
- `http://localhost:3002/passport/buyer-0x4f9a-lexnet-d86156e8`

Expected:
- Dashboard tells the recommendation-only pilot story.
- Case detail shows operator context and safe next action.
- Passports page explains publication model.
- Public passport is privacy-safe and shareable.
- Console has no errors, excluding normal dev-mode warnings.

- [ ] **Step 3: Check git status**

Run:

```bash
git status --short --ignored .lexnet-data
```

Expected: no source changes, only ignored `.lexnet-data/` if pilot data exists.

- [ ] **Step 4: Summarize handoff**

Report:
- Commit list created during implementation.
- Verification commands and outcomes.
- Browser walkthrough pages checked.
- Remaining limitations: still local pilot/demo, not production settlement or custody.

## Self-Review

- Spec coverage: dashboard, case detail, passports, public passport, testing, and no-production-infra constraints are covered by Tasks 1-5.
- Placeholder scan: no TBD/TODO/fill-in steps remain.
- Type consistency: helper names and existing components match current files inspected before writing this plan.
