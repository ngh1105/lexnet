# Balanced Visual Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LexNet feel like a polished pilot product by improving shared visual hierarchy and guided review surfaces across all active pilot routes.

**Architecture:** Keep the existing Next.js App Router, current client components, and domain/API behavior. Add a richer shared visual vocabulary in `frontend/src/app/globals.css`, then apply it selectively to existing dashboard, case detail, intake, passport, and public passport components. Avoid production infrastructure, new dependencies, routing changes, and custody/payment/finality claims.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing CSS classes, Lucide icons, Node `tsx --test`, Playwright MCP browser checks.

---

## File Structure

- Modify `frontend/src/app/globals.css` — shared balanced visual system: richer panels, topbars, metrics, tables, forms, hero/report/action classes, responsive polish.
- Modify `frontend/src/components/CommerceDashboardClient.tsx` — apply command-center classes and improve dashboard visual hierarchy without changing filters/data.
- Modify `frontend/src/components/CaseDetailClient.tsx` — apply review-workspace classes and improve visual grouping for operator brief, evidence, recommendation, and proof areas.
- Modify `frontend/src/components/NewCaseForm.tsx` — make intake feel guided with a stronger form shell, overview rail, and improved sections while preserving validation/submit behavior.
- Modify `frontend/src/components/TrustPassportsClient.tsx` — polish passport management cards and publication model visuals without changing API calls.
- Modify `frontend/src/components/PublicPassportClient.tsx` — present public passport as a premium shareable trust report while preserving aggregate-only fields.
- Do not modify `frontend/src/lib/`, API routes, contracts, dependencies, vendored GenLayer SDK files, or `.lexnet-data/`.

## Task 1: Shared Visual System Polish

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Inspect current pilot pages in browser**

Run:

```bash
npm --prefix frontend run demo:dev
```

Open:
- `http://localhost:3002/`
- `http://localhost:3002/cases/lx-case-demo-settlement`
- `http://localhost:3002/cases/new`
- `http://localhost:3002/passports`
- `http://localhost:3002/passport/buyer-0x4f9a-lexnet-d86156e8`

Expected before changes: pages load, but cards/panels use mostly flat 8px-radius styling and the app still feels visually sparse.

- [ ] **Step 2: Update root tokens and app background**

In `frontend/src/app/globals.css`, replace the current `:root` block with:

```css
:root {
  --bg: #f4f1ea;
  --bg-deep: #ebe5d8;
  --surface: #ffffff;
  --surface-subtle: #fbfaf7;
  --surface-muted: #f1eee8;
  --surface-raised: #fffdf8;
  --ink: #111827;
  --ink-soft: #374151;
  --muted: #5b6472;
  --muted-light: #8a93a3;
  --border: #e4ded2;
  --border-strong: #d4cbbc;
  --charcoal: #18181b;
  --charcoal-soft: #242428;
  --teal: #0f766e;
  --teal-strong: #115e59;
  --teal-soft: #e6f4f1;
  --blue: #2563eb;
  --blue-soft: #eaf1ff;
  --amber: #d97706;
  --amber-soft: #fff7e6;
  --red: #dc2626;
  --red-soft: #fef2f2;
  --green: #059669;
  --green-soft: #e8f7ef;
  --shadow-sm: 0 1px 2px rgba(17, 24, 39, 0.05);
  --shadow-md: 0 18px 45px rgba(17, 24, 39, 0.09);
  --shadow-lg: 0 24px 70px rgba(17, 24, 39, 0.13);
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 22px;
}
```

Replace the `.app-shell` background with:

```css
.app-shell {
  display: flex;
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 32rem),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 30rem),
    linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(244, 241, 234, 0.9)),
    var(--bg);
  color: var(--ink);
}
```

- [ ] **Step 3: Strengthen shared cards, topbars, metrics, forms, and tables**

In `frontend/src/app/globals.css`, update these existing rules:

```css
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 76px;
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px solid rgba(212, 203, 188, 0.82);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(251, 250, 247, 0.86)),
    var(--surface);
  box-shadow: var(--shadow-md);
}

.topbar-title {
  color: var(--ink);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.topbar-subtitle {
  max-width: 760px;
  margin-top: 7px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.65;
}

.surface,
.glass-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.panel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(251, 250, 247, 0.94)),
    var(--surface);
  border: 1px solid rgba(212, 203, 188, 0.86);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-md);
}

.inspector {
  background:
    linear-gradient(180deg, rgba(36, 36, 40, 0.035), rgba(255, 255, 255, 0.86)),
    var(--surface-subtle);
  border: 1px solid rgba(212, 203, 188, 0.9);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-md);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
}

.metric-card {
  position: relative;
  display: grid;
  gap: 12px;
  min-height: 124px;
  padding: 18px;
  overflow: hidden;
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.98), rgba(251, 250, 247, 0.86)),
    var(--surface);
  border: 1px solid rgba(212, 203, 188, 0.82);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.metric-card::after {
  content: "";
  position: absolute;
  inset: auto 16px 0;
  height: 3px;
  border-radius: 999px 999px 0 0;
  background: linear-gradient(90deg, rgba(15, 118, 110, 0.68), rgba(37, 99, 235, 0.52));
}

.metric-value {
  color: var(--ink);
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
}

.queue-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(212, 203, 188, 0.9);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.queue-table th {
  height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(251, 250, 247, 0.82);
  color: var(--muted);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-align: left;
  text-transform: uppercase;
}

.queue-table td {
  padding: 16px;
  border-bottom: 1px solid rgba(228, 222, 210, 0.78);
  color: var(--ink-soft);
  font-size: 13px;
  vertical-align: middle;
}

.inspector-row,
.evidence-row {
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 0 rgba(17, 24, 39, 0.03);
}

.form-section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(212, 203, 188, 0.88);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(251, 250, 247, 0.72)),
    var(--surface-subtle);
  box-shadow: var(--shadow-sm);
}

.lexnet-input {
  width: 100%;
  min-height: 42px;
  background: var(--surface);
  border: 1px solid rgba(212, 203, 188, 0.92);
  border-radius: var(--radius-sm);
  padding: 11px 13px;
  color: var(--ink);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.btn-primary,
.btn-emerald,
.btn-secondary,
.btn-ghost,
.btn-quiet {
  border-radius: var(--radius-sm);
}
```

Preserve existing selectors not shown here unless the replacement explicitly covers them.

- [ ] **Step 4: Add premium pilot utility classes**

Append the following CSS near the shared component classes in `frontend/src/app/globals.css`:

```css
.hero-panel {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(212, 203, 188, 0.88);
  background:
    radial-gradient(circle at 12% 0%, rgba(15, 118, 110, 0.16), transparent 28rem),
    radial-gradient(circle at 92% 18%, rgba(37, 99, 235, 0.13), transparent 26rem),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(251, 250, 247, 0.88));
  box-shadow: var(--shadow-lg);
}

.hero-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(17, 24, 39, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(17, 24, 39, 0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(135deg, rgba(0, 0, 0, 0.55), transparent 64%);
}

.hero-panel > * {
  position: relative;
  z-index: 1;
}

.surface-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 14px;
}

.insight-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(212, 203, 188, 0.82);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(251, 250, 247, 0.82)),
    var(--surface);
  box-shadow: var(--shadow-sm);
}

.action-rail {
  display: grid;
  gap: 14px;
  align-content: start;
}

.workspace-shell {
  display: grid;
  gap: 18px;
}

.review-panel {
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(251, 250, 247, 0.9)),
    var(--surface);
  box-shadow: var(--shadow-md);
}

.trust-report-shell {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(212, 203, 188, 0.9);
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.14), transparent 26rem),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 24rem),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(251, 250, 247, 0.9));
  box-shadow: var(--shadow-lg);
  padding: 24px;
}

.step-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--charcoal);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}
```

- [ ] **Step 5: Improve responsive polish**

At the bottom of `frontend/src/app/globals.css`, ensure the existing responsive section includes:

```css
@media (max-width: 860px) {
  .app-shell {
    display: block;
  }

  .sidebar-shell {
    width: 100%;
    min-height: auto;
  }

  .main-shell {
    padding: 16px;
  }

  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .search-box {
    min-width: min(100%, 250px);
  }

  .metric-grid,
  .surface-grid {
    grid-template-columns: 1fr;
  }
}
```

If an `@media (max-width: 860px)` block already exists, merge these declarations into it rather than duplicating the block.

- [ ] **Step 6: Verify shared visual system**

Run:

```bash
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
```

Expected: both commands exit 0.

- [ ] **Step 7: Browser-check shared styling**

Open `/`, `/cases/new`, and `/passport/buyer-0x4f9a-lexnet-d86156e8`.

Expected:
- Panels, metrics, topbars, and forms have stronger depth and spacing.
- No horizontal overflow at desktop width.
- No console errors except normal dev-mode warnings.

- [ ] **Step 8: Commit shared visual system**

Run:

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add balanced visual system polish"
```

## Task 2: Dashboard Command Center Polish

**Files:**
- Modify: `frontend/src/components/CommerceDashboardClient.tsx`

- [ ] **Step 1: Apply hero and workspace classes**

In `frontend/src/components/CommerceDashboardClient.tsx`, change:

```tsx
<header className="topbar">
```

to:

```tsx
<header className="topbar hero-panel">
```

Change:

```tsx
<section className="metric-grid" style={{ marginBottom: 16 }}>
```

to:

```tsx
<section className="metric-grid" style={{ marginBottom: 18 }}>
```

Change:

```tsx
<section className="panel command-strip" style={{ marginBottom: 16 }}>
```

to:

```tsx
<section className="panel command-strip hero-panel" style={{ marginBottom: 18 }}>
```

Change:

```tsx
<section className="dashboard-grid">
```

to:

```tsx
<section className="dashboard-grid workspace-shell">
```

- [ ] **Step 2: Make the case inbox panel feel like a primary workspace**

Change the case inbox wrapper from:

```tsx
<div className="panel" style={{ padding: 0, overflow: "hidden" }}>
```

to:

```tsx
<div className="panel review-panel" style={{ padding: 0, overflow: "hidden" }}>
```

Inside that panel, update the header style object by changing `padding: 14` to `padding: 18` and adding:

```tsx
background: "linear-gradient(180deg, rgba(251,250,247,0.92), rgba(255,255,255,0.82))",
```

The final opening style object should contain:

```tsx
style={{
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 18,
  borderBottom: "1px solid var(--border)",
  background: "linear-gradient(180deg, rgba(251,250,247,0.92), rgba(255,255,255,0.82))",
}}
```

- [ ] **Step 3: Convert right-hand aside into an action rail**

Change:

```tsx
<aside style={{ display: "grid", gap: 16 }}>
```

to:

```tsx
<aside className="action-rail">
```

For the Pilot Operator Brief panel, change:

```tsx
<div className="panel" style={{ display: "grid", gap: 12 }}>
```

to:

```tsx
<div className="panel hero-panel" style={{ display: "grid", gap: 12 }}>
```

Only apply `hero-panel` to the first panel in the aside.

- [ ] **Step 4: Browser-check dashboard**

Open `http://localhost:3002/`.

Expected:
- Dashboard topbar and walkthrough strip have richer command-center styling.
- Case inbox reads as the primary workspace.
- Right column reads as an operator rail.
- Recommendation-only copy from the previous pilot polish remains visible.
- No console errors except normal dev-mode warnings.

- [ ] **Step 5: Verify dashboard task**

Run:

```bash
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: exits 0.

- [ ] **Step 6: Commit dashboard visual polish**

Run:

```bash
git add frontend/src/components/CommerceDashboardClient.tsx
git commit -m "feat: polish dashboard command center visuals"
```

## Task 3: Case Detail Review Workspace Polish

**Files:**
- Modify: `frontend/src/components/CaseDetailClient.tsx`

- [ ] **Step 1: Apply hero and workspace classes**

In `CaseDetailClient.tsx`, change:

```tsx
<header className="topbar">
```

to:

```tsx
<header className="topbar hero-panel">
```

Change the Operator Brief section from:

```tsx
<section className="panel" style={{ marginBottom: 16, display: "grid", gap: 10 }}>
```

to:

```tsx
<section className="panel hero-panel" style={{ marginBottom: 18, display: "grid", gap: 12 }}>
```

Change:

```tsx
<div className="two-column">
```

to:

```tsx
<div className="two-column workspace-shell">
```

- [ ] **Step 2: Make the inspector aside an action rail**

Change:

```tsx
<aside className="inspector" style={{ display: "grid", gap: 16 }}>
```

to:

```tsx
<aside className="inspector action-rail">
```

Change the AI score card wrapper from:

```tsx
<div
  style={{
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
  }}
>
```

to:

```tsx
<div className="insight-card" style={{ marginTop: 12 }}>
```

Keep its children unchanged.

- [ ] **Step 3: Make recommendation/proof panels feel like decision support**

Change the Settlement Recommendation wrapper from:

```tsx
<div
  style={{
    padding: 14,
    borderRadius: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
  }}
>
```

to:

```tsx
<div className="insight-card">
```

Change both side panels with `className="panel" style={{ background: "var(--surface)", display: "grid", gap: 10 }}` to:

```tsx
<div className="panel review-panel" style={{ display: "grid", gap: 10 }}>
```

These are the Verification Report panel and the GenLayer Execution Proof panel.

- [ ] **Step 4: Browser-check case detail**

Open `http://localhost:3002/cases/lx-case-demo-settlement`.

Expected:
- Case detail reads as an evidence review workspace.
- Operator Brief remains visible and safe.
- AI verdict, recommendation, and GenLayer proof feel grouped as decision support.
- Local review button still works.
- No console errors except normal dev-mode warnings.

- [ ] **Step 5: Verify case detail task**

Run:

```bash
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: exits 0.

- [ ] **Step 6: Commit case detail visual polish**

Run:

```bash
git add frontend/src/components/CaseDetailClient.tsx
git commit -m "feat: polish case detail review workspace"
```

## Task 4: Guided Intake Visual Polish

**Files:**
- Modify: `frontend/src/components/NewCaseForm.tsx`

- [ ] **Step 1: Add guided intake context data**

In `frontend/src/components/NewCaseForm.tsx`, after the `useState` declarations, add:

```tsx
  const intakeStats = [
    { label: "Seed cases", value: seedCases.length.toLocaleString() },
    { label: "Flow", value: "Local pilot" },
    { label: "Output", value: "Review-ready case" },
  ];
```

- [ ] **Step 2: Upgrade the form shell**

Change the form opening from:

```tsx
<form onSubmit={handleSubmit} className="panel" style={{ padding: 0, overflow: "hidden" }}>
```

to:

```tsx
<form onSubmit={handleSubmit} className="panel review-panel" style={{ padding: 0, overflow: "hidden" }}>
```

Change the top intro wrapper from:

```tsx
<div style={{ padding: 18, borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
```

to:

```tsx
<div className="hero-panel" style={{ padding: 22, borderBottom: "1px solid var(--border)" }}>
```

Inside this wrapper, after the existing description `<div style={{ marginTop: 8, ... }}>...</div>`, insert:

```tsx
        <div className="surface-grid" style={{ marginTop: 16 }}>
          {intakeStats.map((item) => (
            <div key={item.label} className="insight-card">
              <span className="section-label">{item.label}</span>
              <strong style={{ color: "var(--ink)", fontSize: 18 }}>{item.value}</strong>
            </div>
          ))}
        </div>
```

- [ ] **Step 3: Make form sections feel like guided steps**

Change the `FormSection` signature from:

```tsx
function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
```

to:

```tsx
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
```

Change its return to:

```tsx
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
```

Update the three usages:

```tsx
<FormSection title="Parties" step="1" icon={<Scale size={14} strokeWidth={1.75} />}>
```

```tsx
<FormSection title="Agreement" step="2" icon={<ShieldCheck size={14} strokeWidth={1.75} />}>
```

```tsx
<FormSection title="Acceptance Criteria" step="3" icon={<TriangleAlert size={14} strokeWidth={1.75} />}>
```

- [ ] **Step 4: Browser-check guided intake**

Open `http://localhost:3002/cases/new`.

Expected:
- Intake appears as a guided form with stronger intro and numbered sections.
- Existing validation still displays errors for empty submit.
- Creating a valid case still routes to the new case detail page.
- No console errors except normal dev-mode warnings.

- [ ] **Step 5: Verify intake task**

Run:

```bash
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: exits 0.

- [ ] **Step 6: Commit guided intake polish**

Run:

```bash
git add frontend/src/components/NewCaseForm.tsx
git commit -m "feat: polish guided case intake visuals"
```

## Task 5: Passport Management Visual Polish

**Files:**
- Modify: `frontend/src/components/TrustPassportsClient.tsx`

- [ ] **Step 1: Apply hero and workspace classes**

In `TrustPassportsClient.tsx`, change:

```tsx
<header className="topbar">
```

to:

```tsx
<header className="topbar hero-panel">
```

Change the Publication Model panel from:

```tsx
<section className="panel" style={{ marginBottom: 16, display: "grid", gap: 10 }}>
```

to:

```tsx
<section className="panel hero-panel" style={{ marginBottom: 18, display: "grid", gap: 12 }}>
```

Change:

```tsx
<section className="metric-grid" style={{ marginBottom: 16 }}>
```

to:

```tsx
<section className="metric-grid" style={{ marginBottom: 18 }}>
```

- [ ] **Step 2: Use shared surface grid for passport cards**

Replace the passport grid opening:

```tsx
<section
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(310px, 100%), 1fr))",
    gap: 14,
  }}
>
```

with:

```tsx
<section className="surface-grid">
```

- [ ] **Step 3: Polish each passport card**

Change the `PassportCard` article opening from:

```tsx
<article className="panel" style={{ display: "grid", gap: 16, minWidth: 0, overflow: "hidden" }}>
```

to:

```tsx
<article className="panel review-panel" style={{ display: "grid", gap: 16, minWidth: 0, overflow: "hidden" }}>
```

Change the backend/local state box style object from:

```tsx
style={{
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 8,
  border: "1px solid rgba(37,99,235,0.18)",
  background: "var(--blue-soft)",
  color: "var(--blue)",
  fontSize: 12,
  fontWeight: 800,
}}
```

to:

```tsx
style={{
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: "var(--radius-md)",
  border: "1px solid rgba(37,99,235,0.18)",
  background: "linear-gradient(135deg, rgba(234,241,255,0.95), rgba(255,255,255,0.78))",
  color: "var(--blue)",
  fontSize: 12,
  fontWeight: 800,
}}
```

- [ ] **Step 4: Browser-check passports**

Open `http://localhost:3002/passports`.

Expected:
- Page reads as operator trust management.
- Publication model and passport cards have stronger visual hierarchy.
- Backend/public preview and local-demo language remains unchanged.
- `/api/passports` returns 200.
- No console errors except normal dev-mode warnings.

- [ ] **Step 5: Verify passports task**

Run:

```bash
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: exits 0.

- [ ] **Step 6: Commit passport management polish**

Run:

```bash
git add frontend/src/components/TrustPassportsClient.tsx
git commit -m "feat: polish passport management visuals"
```

## Task 6: Public Passport Trust Report Polish

**Files:**
- Modify: `frontend/src/components/PublicPassportClient.tsx`

- [ ] **Step 1: Apply trust report shell**

In `PublicPassportClient.tsx`, change:

```tsx
<div className="content-frame" style={{ maxWidth: 920, margin: "0 auto" }}>
```

to:

```tsx
<div className="content-frame trust-report-shell" style={{ maxWidth: 920, margin: "0 auto" }}>
```

Change:

```tsx
<header className="topbar">
```

to:

```tsx
<header className="topbar hero-panel" style={{ boxShadow: "none" }}>
```

Change:

```tsx
<section className="metric-grid" style={{ marginBottom: 16 }}>
```

to:

```tsx
<section className="metric-grid" style={{ marginBottom: 18 }}>
```

Change:

```tsx
<section className="panel" style={{ display: "grid", gap: 16 }}>
```

to:

```tsx
<section className="panel review-panel" style={{ display: "grid", gap: 16 }}>
```

- [ ] **Step 2: Elevate privacy boundary chips**

Change the privacy chip container from:

```tsx
<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
```

to:

```tsx
<div className="insight-card" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
```

Keep the chip array unchanged.

- [ ] **Step 3: Browser-check public passport**

Open `http://localhost:3002/passport/buyer-0x4f9a-lexnet-d86156e8`.

Expected:
- Public passport appears as a polished trust report/card.
- Only redacted subject, aggregate metrics, risk state, privacy chips, updated date, and public slug are visible.
- No raw parties, evidence URLs, private case IDs, audit events, workspace data, or payout status is visible.
- No console errors except normal dev-mode warnings.

- [ ] **Step 4: Verify public passport task**

Run:

```bash
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: exits 0.

- [ ] **Step 5: Commit public passport report polish**

Run:

```bash
git add frontend/src/components/PublicPassportClient.tsx
git commit -m "feat: polish public passport trust report"
```

## Task 7: Final Verification And Handoff

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
- `http://localhost:3002/cases/new`
- `http://localhost:3002/passports`
- `http://localhost:3002/passport/buyer-0x4f9a-lexnet-d86156e8`

Expected:
- Dashboard reads as a command center.
- Case detail reads as an evidence review workspace.
- New case reads as guided intake.
- Passports reads as operator trust management.
- Public passport reads as a shareable privacy-safe trust signal.
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
- Remaining limitation: still local pilot/demo, not production settlement/custody/payout/finality infrastructure.

## Self-Review

- Spec coverage: shared visual system, dashboard, case detail, guided intake, passports, public passport, verification, and no-production-infra constraints are covered by Tasks 1-7.
- Placeholder scan: no TBD/TODO/fill-in steps remain.
- Type consistency: class names introduced in Task 1 are referenced consistently in Tasks 2-6.
- Scope check: plan is a visual polish batch only and does not require lib/API/persistence changes.
