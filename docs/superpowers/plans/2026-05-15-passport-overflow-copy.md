# Passport Card Overflow and Copy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix passport card overflow at narrow desktop widths and replace demo wording with workspace/publish language.

**Architecture:** Keep layout changes in `frontend/src/app/globals.css` with passport-specific classes so the card can shrink cleanly without affecting other panels. Move publication copy into a tiny testable helper under `frontend/src/lib/platform/` and have `TrustPassportsClient` read from that helper. No data-model changes.

**Tech Stack:** Next.js App Router, React, CSS, node:test via `tsx`.

---

### Task 1: Add testable passport publication copy helper

**Files:**
- Create: `frontend/src/lib/platform/passport-copy.ts`
- Modify: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { getPassportPublicationCopy } from "../src/lib/platform/passport-copy";

test("getPassportPublicationCopy returns workspace draft passport copy", () => {
  assert.deepEqual(getPassportPublicationCopy(), {
    publicationModelCopy:
      "Workspace draft passports are derived from reviewed case history. Create publish records before publication controls apply.",
    publishButtonLabel: "Create publish records",
    draftPassportNote:
      "Workspace draft passport generated from reviewed case history. Create a publish record to enable the privacy-safe public preview.",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test:platform`
Expected: FAIL because `getPassportPublicationCopy` is missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export function getPassportPublicationCopy() {
  return {
    publicationModelCopy:
      "Workspace draft passports are derived from reviewed case history. Create publish records before publication controls apply.",
    publishButtonLabel: "Create publish records",
    draftPassportNote:
      "Workspace draft passport generated from reviewed case history. Create a publish record to enable the privacy-safe public preview.",
  } as const;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test:platform`
Expected: PASS for new helper test.

---

### Task 2: Fix passport card layout and update copy

**Files:**
- Modify: `frontend/src/components/TrustPassportsClient.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Update component markup to use passport-specific layout classes**

```tsx
const passportCopy = getPassportPublicationCopy();

return (
  <article className="panel review-panel passport-card">
    <div className="passport-card-header">
      <div style={{ minWidth: 0 }}>
        ...
      </div>
      <span className="status-chip" style={{ ... }}>
        {passport.trustLevel}
      </span>
    </div>

    <div className="passport-card-stats">
      <PassportMetric ... />
      <PassportMetric ... />
      <PassportMetric ... />
      <PassportMetric ... />
    </div>

    <div className="passport-card-note">
      {backendPassport ? (
        <>
          <div>
            Backend record: {backendPassport.published ? "Published" : "Unpublished"} · {backendPassport.redactedSubject}
          </div>
          {backendPassport.published ? (
            <a href={publicPath} style={{ color: "inherit", textDecoration: "underline" }}>
              Public preview: {publicPath}
            </a>
          ) : (
            <span>Publish to create a public preview link.</span>
          )}
          <button ...>
            {backendPassport.published ? "Unpublish" : "Publish"}
          </button>
        </>
      ) : (
        <span>{passportCopy.draftPassportNote}</span>
      )}
    </div>
  </article>
);
```

```tsx
<button type="button" className="primary-button" onClick={generateBackendPassports}>
  {passportCopy.publishButtonLabel}
</button>
```

```tsx
<section className="panel hero-panel" ...>
  <p className="muted" ...>
    {passportCopy.publicationModelCopy}
  </p>
</section>
```

- [ ] **Step 2: Add CSS for shrink-safe card layout**

```css
.passport-card {
  display: grid;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
}

.passport-card > * {
  min-width: 0;
}

.passport-card-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  min-width: 0;
}

.passport-card-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}

.passport-card-note {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(231, 246, 241, 0.12);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.055);
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.passport-card-note span,
.passport-card-note a {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}

.passport-breakdown-row {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.passport-breakdown-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
```

- [ ] **Step 3: Run component-level verification**

Run: `npm --prefix frontend run test:platform`
Expected: PASS.

---

### Task 3: Verify desktop and mobile rendering in browser

**Files:**
- No code changes

- [ ] **Step 1: Start dev server**

Run: `npm --prefix frontend run dev`
Expected: Next dev server on `http://localhost:3002`.

- [ ] **Step 2: Check passport page at desktop viewport**

Open `/passports` at `1236x576`.
Expected: passport card stays inside viewport, header does not overflow, score breakdown and stat values remain visible, note panel wraps cleanly.

- [ ] **Step 3: Check passport page at mobile viewport**

Resize to a narrow mobile size.
Expected: card stacks cleanly, no horizontal scroll from passport content, copy remains readable.

- [ ] **Step 4: Confirm updated copy**

Expected visible text:
- `Create publish records`
- `Workspace draft passports are derived from reviewed case history...`
- `Workspace draft passport generated from reviewed case history...`

- [ ] **Step 5: Commit only if requested later**

No git commit in this session unless user asks for it.
