# Product Demo Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade LexNet from a small MVP screen set into an impressive product demo with a command-center dashboard, richer case detail story, and stronger trust passport showcase without fake on-chain behavior.

**Architecture:** Keep the existing browser-local commerce trust architecture and pure domain functions. Add demo-grade derived view models in `lexnet-domain.ts`, then use them to enrich the current dashboard, case detail, and passport pages instead of introducing backend persistence or new transaction flows.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, lucide-react icons, existing CSS design system in `frontend/src/app/globals.css`, existing localStorage merge helpers, existing domain tests via `tsx --test`.

---

## File Structure

- Modify `frontend/src/lib/lexnet-types.ts`: add small view-model interfaces for command center metrics, case timeline items, evidence quality, and passport score breakdown.
- Modify `frontend/src/lib/lexnet-domain.ts`: add pure derivation helpers for command center metrics, high-priority reviews, case timeline, evidence quality, and passport score breakdown.
- Modify `frontend/tests/lexnet-domain.test.ts`: add tests for all new domain helpers before using them in UI.
- Modify `frontend/src/components/CommerceDashboardClient.tsx`: upgrade the dashboard into an AI Commerce Trust Command Center using existing cases and derived metrics.
- Modify `frontend/src/components/CaseDetailClient.tsx`: add timeline, verification report card, and evidence provenance summary.
- Modify `frontend/src/components/TrustPassportsClient.tsx`: enhance passport cards with score breakdown and public-preview framing.
- Modify `frontend/src/app/globals.css`: add focused reusable classes for command-center and timeline layouts only when inline styles would become noisy.

---

### Task 1: Domain View Models and Tests

**Files:**
- Modify: `frontend/src/lib/lexnet-types.ts`
- Modify: `frontend/src/lib/lexnet-domain.ts`
- Test: `frontend/tests/lexnet-domain.test.ts`

- [ ] **Step 1: Add view-model types**

Append these interfaces to `frontend/src/lib/lexnet-types.ts` after `TrustPassport`:

```ts
export interface CommandCenterMetrics {
  protectedValue: number;
  aiReviewedCases: number;
  settlementReadyCases: number;
  passportsIssued: number;
  evidenceItems: number;
}

export interface HighPriorityReview {
  caseId: string;
  title: string;
  status: CommerceCaseStatus;
  amountReference: number;
  evidenceCount: number;
  scoreLabel: string;
  nextAction: string;
  priorityReason: string;
}

export interface CaseTimelineItem {
  label: string;
  detail: string;
  status: "complete" | "active" | "blocked";
}

export interface EvidenceQualitySummary {
  totalItems: number;
  repositoryItems: number;
  documentItems: number;
  webItems: number;
  qualityLabel: string;
}

export interface PassportScoreBreakdown {
  verificationRate: number;
  scoreStrength: number;
  valueWeight: number;
  riskPenalty: number;
}
```

- [ ] **Step 2: Import the new types in domain file**

Update the import list in `frontend/src/lib/lexnet-domain.ts` to include:

```ts
  CaseTimelineItem,
  CommandCenterMetrics,
  EvidenceQualitySummary,
  HighPriorityReview,
  PassportScoreBreakdown,
```

- [ ] **Step 3: Add command-center helpers**

Append these functions near the existing stats/passport helpers in `frontend/src/lib/lexnet-domain.ts`:

```ts
export function buildCommandCenterMetrics(cases: CommerceCase[]): CommandCenterMetrics {
  const passports = buildTrustPassports(cases);

  return {
    protectedValue: cases.reduce((sum, commerceCase) => sum + commerceCase.amountReference, 0),
    aiReviewedCases: cases.filter((commerceCase) => commerceCase.verificationReport).length,
    settlementReadyCases: cases.filter((commerceCase) => SETTLEMENT_READY_STATUSES.has(commerceCase.status)).length,
    passportsIssued: passports.length,
    evidenceItems: cases.reduce((sum, commerceCase) => sum + commerceCase.evidence.length, 0),
  };
}

export function buildHighPriorityReviews(cases: CommerceCase[]): HighPriorityReview[] {
  return [...cases]
    .sort((left, right) => getPriorityScore(right) - getPriorityScore(left))
    .slice(0, 4)
    .map((commerceCase) => {
      const summary = buildVerificationSummary(commerceCase);

      return {
        caseId: commerceCase.id,
        title: commerceCase.title,
        status: commerceCase.status,
        amountReference: commerceCase.amountReference,
        evidenceCount: commerceCase.evidence.length,
        scoreLabel: summary.scoreLabel,
        nextAction: summary.nextAction,
        priorityReason: getPriorityReason(commerceCase),
      };
    });
}

function getPriorityScore(commerceCase: CommerceCase): number {
  const report = commerceCase.verificationReport;
  const riskWeight = report?.riskFlags?.length ? 100 : 0;
  const settlementWeight = SETTLEMENT_READY_STATUSES.has(commerceCase.status) ? 80 : 0;
  const valueWeight = Math.min(Math.round(commerceCase.amountReference / 100), 60);
  const evidenceWeight = commerceCase.evidence.length > 0 ? 25 : 0;

  return riskWeight + settlementWeight + valueWeight + evidenceWeight;
}

function getPriorityReason(commerceCase: CommerceCase): string {
  if (commerceCase.verificationReport?.riskFlags?.length) {
    return "Risk flags need operator review";
  }
  if (commerceCase.status === "SETTLEMENT_RECOMMENDED") {
    return "Settlement recommendation is ready";
  }
  if (commerceCase.evidence.length === 0) {
    return "Evidence has not been submitted";
  }
  return "High-value case ready for review";
}
```

- [ ] **Step 4: Add case detail helpers**

Append these functions to `frontend/src/lib/lexnet-domain.ts`:

```ts
export function buildCaseTimeline(commerceCase: CommerceCase): CaseTimelineItem[] {
  const hasEvidence = commerceCase.evidence.length > 0;
  const hasReport = Boolean(commerceCase.verificationReport);
  const isSettlementReady = SETTLEMENT_READY_STATUSES.has(commerceCase.status);

  return [
    {
      label: "Case opened",
      detail: commerceCase.createdAt.slice(0, 10),
      status: "complete",
    },
    {
      label: "Evidence submitted",
      detail: hasEvidence ? `${commerceCase.evidence.length} evidence item(s)` : "Waiting for seller evidence",
      status: hasEvidence ? "complete" : "active",
    },
    {
      label: "AI verification",
      detail: hasReport ? `${commerceCase.verificationReport?.score}/100 confidence score` : "Run local verification or GenLayer preview",
      status: hasReport ? "complete" : hasEvidence ? "active" : "blocked",
    },
    {
      label: "Settlement decision",
      detail: isSettlementReady ? getNextAction(commerceCase) : "Not ready for settlement",
      status: isSettlementReady ? "active" : "blocked",
    },
    {
      label: "Trust passport update",
      detail: hasReport ? "Included in buyer and seller trust history" : "Pending verified report",
      status: hasReport ? "complete" : "blocked",
    },
  ];
}

export function buildEvidenceQualitySummary(commerceCase: CommerceCase): EvidenceQualitySummary {
  const repositoryItems = commerceCase.evidence.filter((item) => item.resourceType === "repository").length;
  const documentItems = commerceCase.evidence.filter((item) => item.resourceType === "document").length;
  const webItems = commerceCase.evidence.filter((item) => item.resourceType === "web").length;
  const totalItems = commerceCase.evidence.length;

  return {
    totalItems,
    repositoryItems,
    documentItems,
    webItems,
    qualityLabel: getEvidenceQualityLabel(totalItems, repositoryItems, documentItems),
  };
}

function getEvidenceQualityLabel(totalItems: number, repositoryItems: number, documentItems: number): string {
  if (totalItems === 0) {
    return "No evidence submitted";
  }
  if (repositoryItems > 0 && documentItems > 0) {
    return "Strong provenance mix";
  }
  if (totalItems >= 2) {
    return "Reviewable evidence set";
  }
  return "Thin evidence set";
}
```

- [ ] **Step 5: Add passport breakdown helper**

Append this function to `frontend/src/lib/lexnet-domain.ts`:

```ts
export function buildPassportScoreBreakdown(passport: TrustPassport): PassportScoreBreakdown {
  const verificationRate = passport.totalCases > 0 ? Math.round((passport.verifiedCases / passport.totalCases) * 100) : 0;
  const scoreStrength = passport.averageScore;
  const valueWeight = Math.min(Math.round(passport.totalReferencedValue / 1000), 100);
  const riskPenalty = Math.min(passport.riskFlags.length * 20, 100);

  return {
    verificationRate,
    scoreStrength,
    valueWeight,
    riskPenalty,
  };
}
```

- [ ] **Step 6: Add tests for new helpers**

Append these tests to `frontend/tests/lexnet-domain.test.ts` and update the import list to include the new helper names:

```ts
test("buildCommandCenterMetrics summarizes demo operating metrics", () => {
  const metrics = buildCommandCenterMetrics(seedCases);

  assert.equal(metrics.protectedValue > 0, true);
  assert.equal(metrics.aiReviewedCases > 0, true);
  assert.equal(metrics.passportsIssued > 0, true);
  assert.equal(metrics.evidenceItems > 0, true);
});

test("buildHighPriorityReviews returns review cards with reasons", () => {
  const reviews = buildHighPriorityReviews(seedCases);

  assert.equal(reviews.length > 0, true);
  assert.equal(Boolean(reviews[0].caseId), true);
  assert.equal(Boolean(reviews[0].priorityReason), true);
});

test("buildCaseTimeline tracks evidence, verification, settlement, and passport steps", () => {
  const timeline = buildCaseTimeline(seedCases[0]);

  assert.deepEqual(
    timeline.map((item) => item.label),
    [
      "Case opened",
      "Evidence submitted",
      "AI verification",
      "Settlement decision",
      "Trust passport update",
    ]
  );
});

test("buildEvidenceQualitySummary labels evidence mix", () => {
  const summary = buildEvidenceQualitySummary(seedCases[0]);

  assert.equal(summary.totalItems, seedCases[0].evidence.length);
  assert.equal(Boolean(summary.qualityLabel), true);
});

test("buildPassportScoreBreakdown derives bounded score parts", () => {
  const passport = buildTrustPassports(seedCases)[0];
  const breakdown = buildPassportScoreBreakdown(passport);

  assert.equal(breakdown.verificationRate >= 0 && breakdown.verificationRate <= 100, true);
  assert.equal(breakdown.scoreStrength >= 0 && breakdown.scoreStrength <= 100, true);
  assert.equal(breakdown.valueWeight >= 0 && breakdown.valueWeight <= 100, true);
  assert.equal(breakdown.riskPenalty >= 0 && breakdown.riskPenalty <= 100, true);
});
```

- [ ] **Step 7: Run domain tests**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
npm run test:domain
```

Expected: all existing tests plus 5 new tests pass.

- [ ] **Step 8: Commit domain view models**

Run:

```powershell
git -C E:\Dapp\LexNet add frontend/src/lib/lexnet-types.ts frontend/src/lib/lexnet-domain.ts frontend/tests/lexnet-domain.test.ts
git -C E:\Dapp\LexNet commit -m "feat: add command center domain models"
```

---

### Task 2: Command Center Dashboard

**Files:**
- Modify: `frontend/src/components/CommerceDashboardClient.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Import new dashboard helpers and icons**

In `frontend/src/components/CommerceDashboardClient.tsx`, add imports for:

```ts
  buildCommandCenterMetrics,
  buildHighPriorityReviews,
```

from `@/lib/lexnet-domain`, and add lucide icons:

```ts
  Activity,
  ArrowRight,
  ShieldCheck,
  Workflow,
```

- [ ] **Step 2: Derive command center data**

Inside `CommerceDashboardClient`, after `stats`, add:

```ts
  const commandMetrics = useMemo(() => buildCommandCenterMetrics(cases), [cases]);
  const highPriorityReviews = useMemo(() => buildHighPriorityReviews(cases), [cases]);
```

- [ ] **Step 3: Replace the top metric section with command metrics**

Replace the existing metric grid with cards for:

```tsx
<MetricCard icon={<ShieldCheck size={18} strokeWidth={1.75} />} label="Protected Value" value={`$${commandMetrics.protectedValue.toLocaleString()}`} />
<MetricCard icon={<Activity size={18} strokeWidth={1.75} />} label="AI Reviewed" value={commandMetrics.aiReviewedCases.toLocaleString()} />
<MetricCard icon={<BadgeCheck size={18} strokeWidth={1.75} />} label="Settlement Ready" value={commandMetrics.settlementReadyCases.toLocaleString()} />
<MetricCard icon={<IdCard size={18} strokeWidth={1.75} />} label="Trust Passports" value={commandMetrics.passportsIssued.toLocaleString()} />
```

If `IdCard` is not imported in this file, import it from `lucide-react`.

- [ ] **Step 4: Add pipeline panel above the dashboard grid**

Insert this section after the metric grid:

```tsx
<section className="panel command-strip" style={{ marginBottom: 16 }}>
  <div>
    <div className="section-label">
      <Workflow size={14} strokeWidth={1.75} />
      AI Commerce Trust Pipeline
    </div>
    <h2 style={{ marginTop: 8, color: "var(--ink)", fontSize: 20, fontWeight: 900 }}>
      From agreement to portable trust in one review loop
    </h2>
  </div>
  <div className="pipeline-steps">
    {["Intake", "Evidence", "AI Review", "Settlement", "Passport"].map((step, index) => (
      <div key={step} className="pipeline-step">
        <span>{index + 1}</span>
        {step}
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 5: Add high priority review rail**

In the right rail before `EvidenceInspector`, insert:

```tsx
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
```

- [ ] **Step 6: Add CSS classes**

Append to `frontend/src/app/globals.css`:

```css
.command-strip {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  align-items: center;
}

.pipeline-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.pipeline-step,
.priority-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-subtle);
}

.pipeline-step {
  display: grid;
  gap: 8px;
  padding: 12px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
}

.pipeline-step span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--teal-soft);
  color: var(--teal-strong);
}

.priority-card {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 11px;
  color: var(--ink);
  text-decoration: none;
}

.priority-card strong,
.priority-card small {
  display: block;
}

.priority-card strong {
  font-size: 12px;
}

.priority-card small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}

@media (max-width: 980px) {
  .command-strip,
  .pipeline-steps {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Typecheck and commit dashboard upgrade**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
git -C E:\Dapp\LexNet add frontend/src/components/CommerceDashboardClient.tsx frontend/src/app/globals.css
git -C E:\Dapp\LexNet commit -m "feat: upgrade command center dashboard"
```

---

### Task 3: Rich Case Detail Story

**Files:**
- Modify: `frontend/src/components/CaseDetailClient.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Import new helpers and icons**

In `frontend/src/components/CaseDetailClient.tsx`, import from `@/lib/lexnet-domain`:

```ts
  buildCaseTimeline,
  buildEvidenceQualitySummary,
```

Add lucide icons:

```ts
  GitBranch,
  ListChecks,
```

- [ ] **Step 2: Derive timeline and quality summary**

After `riskFlags`, add:

```ts
  const timeline = buildCaseTimeline(commerceCase);
  const evidenceQuality = buildEvidenceQualitySummary(commerceCase);
```

- [ ] **Step 3: Add timeline panel**

After the Agreement panel, insert:

```tsx
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
```

- [ ] **Step 4: Add evidence provenance panel**

Before the Submit Evidence panel, insert:

```tsx
<Panel title="Evidence Provenance" icon={<GitBranch size={15} strokeWidth={1.75} />}>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
    <Metric label="Quality" value={evidenceQuality.qualityLabel} />
    <Metric label="Total Items" value={evidenceQuality.totalItems.toString()} />
    <Metric label="Documents" value={evidenceQuality.documentItems.toString()} />
    <Metric label="Repositories" value={evidenceQuality.repositoryItems.toString()} />
  </div>
</Panel>
```

- [ ] **Step 5: Add verification report card detail**

In the right inspector, after the AI Verdict score card and before Seller Share/Next Action metrics, add:

```tsx
<div className="panel" style={{ background: "var(--surface)", display: "grid", gap: 10 }}>
  <div className="section-label">Verification Report</div>
  <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
    {report?.summary ?? "No verification report has been generated yet."}
  </p>
  <div className="inspector-list">
    <Metric label="Source" value={report?.source ?? "pending"} />
    <Metric label="Reviewed" value={report?.reviewedAt.slice(0, 10) ?? "pending"} />
  </div>
</div>
```

- [ ] **Step 6: Add timeline CSS**

Append to `frontend/src/app/globals.css`:

```css
.case-timeline {
  display: grid;
  gap: 10px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.timeline-item > span {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--border-strong);
}

.timeline-item.complete > span {
  background: var(--teal);
}

.timeline-item.active > span {
  background: var(--amber);
}

.timeline-item.blocked > span {
  background: var(--muted);
}

.timeline-item strong,
.timeline-item small {
  display: block;
}

.timeline-item strong {
  color: var(--ink);
  font-size: 13px;
}

.timeline-item small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}
```

- [ ] **Step 7: Typecheck and commit case detail upgrade**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
git -C E:\Dapp\LexNet add frontend/src/components/CaseDetailClient.tsx frontend/src/app/globals.css
git -C E:\Dapp\LexNet commit -m "feat: enrich case detail story"
```

---

### Task 4: Passport Showcase

**Files:**
- Modify: `frontend/src/components/TrustPassportsClient.tsx`

- [ ] **Step 1: Import passport breakdown helper**

In `frontend/src/components/TrustPassportsClient.tsx`, update domain import to:

```ts
import {
  buildPassportScoreBreakdown,
  buildTrustPassports,
} from "@/lib/lexnet-domain";
```

- [ ] **Step 2: Add public-preview framing to card**

Inside `PassportCard`, after `const color`, add:

```ts
  const breakdown = buildPassportScoreBreakdown(passport);
```

Then before the risk flags block, insert:

```tsx
<div style={{ display: "grid", gap: 8 }}>
  <div className="section-label">Score Breakdown</div>
  <BreakdownRow label="Verification Rate" value={breakdown.verificationRate} />
  <BreakdownRow label="Score Strength" value={breakdown.scoreStrength} />
  <BreakdownRow label="Value Weight" value={breakdown.valueWeight} />
  <BreakdownRow label="Risk Penalty" value={breakdown.riskPenalty} inverted />
</div>

<div
  style={{
    padding: 12,
    borderRadius: 8,
    border: "1px solid rgba(37,99,235,0.18)",
    background: "var(--blue-soft)",
    color: "var(--blue)",
    fontSize: 12,
    fontWeight: 800,
  }}
>
  Public preview ready after backend publishing is enabled.
</div>
```

- [ ] **Step 3: Add `BreakdownRow` component**

Add this function below `PassportCard`:

```tsx
function BreakdownRow({
  label,
  value,
  inverted,
}: {
  label: string;
  value: number;
  inverted?: boolean;
}) {
  const width = `${Math.max(0, Math.min(value, 100))}%`;
  const barColor = inverted ? "var(--red)" : "var(--teal)";

  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "var(--surface-subtle)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <span style={{ display: "block", width, height: "100%", background: barColor }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck and commit passport showcase**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
git -C E:\Dapp\LexNet add frontend/src/components/TrustPassportsClient.tsx
git -C E:\Dapp\LexNet commit -m "feat: enhance trust passport showcase"
```

---

### Task 5: Final Verification and Demo Check

**Files:**
- Verify all modified frontend files.

- [ ] **Step 1: Run domain tests**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
npm run test:domain
```

Expected: all tests pass, including the five new command-center helper tests.

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
```

Expected: exit code 0 and no TypeScript output.

- [ ] **Step 3: Run production build**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
npm run build
```

Expected: build exits 0 and prints `Compiled successfully`.

- [ ] **Step 4: Manual page checklist**

Open these pages:

```text
http://localhost:3002/
http://localhost:3002/cases/lx-case-003
http://localhost:3002/passports
```

Expected visible demo improvements:

```text
AI Commerce Trust Pipeline
High Priority Reviews
Case Timeline
Evidence Provenance
Verification Report
Score Breakdown
Public preview ready after backend publishing is enabled.
```

- [ ] **Step 5: Final status**

Run:

```powershell
git -C E:\Dapp\LexNet status --short
```

Expected: clean working tree.

---

## Self-Review

- Spec coverage: dashboard command center is Task 2; richer case detail is Task 3; passport showcase is Task 4; domain support and tests are Task 1; verification is Task 5.
- Placeholder scan: no TBD/TODO/fill-in-later language remains. Every code step includes exact code or exact replacement content.
- Type consistency: new types and helper names match imports and UI usage.
- Scope check: plan intentionally avoids backend persistence, fake on-chain confirmations, auth/workspace, and real GenLayer browser writes.
