# Balanced Visual Pass Design

## Goal

Make LexNet feel like a polished pilot product rather than a simple demo by improving visual hierarchy, density, and guided review surfaces across the active pilot routes.

## Scope

- Improve the shared visual system used by active Next.js pages: cards, panels, topbars, metrics, chips, tables, forms, and sidebar-adjacent workspace surfaces.
- Improve dashboard `/` presentation so it feels more like an operator command center.
- Improve case detail `/cases/[id]` presentation so it feels more like an evidence review workspace.
- Improve new case `/cases/new` presentation so intake feels guided instead of plain form entry.
- Improve passports `/passports` and public passport `/passport/[slug]` presentation so trust passport management and sharing feel more premium.
- Preserve all Phase F pilot boundaries: recommendation-only, no custody, no payouts, no production settlement, no settlement finality claims.

## Non-Goals

- No production authentication, managed persistence, observability, evidence retention, or payment/custody infrastructure.
- No routing changes or API contract changes.
- No new dependencies or design-system overhaul.
- No broad rewrite of current component architecture.
- No changes to vendored GenLayer SDK files or `.lexnet-data/`.

## Recommended Approach

Use a balanced visual pass: strengthen the existing style language instead of replacing it. Keep the current App Router and component structure, but add a richer shared visual vocabulary in `frontend/src/app/globals.css` and apply it selectively inside existing components.

The result should look more mature without increasing product risk. Most changes should be presentational: improved spacing, larger radii, stronger shadows, gradient/accent surfaces, clearer panels, better section rhythm, and more intentional empty/action states.

## Visual System Changes

Enhance existing shared classes instead of introducing a new design system:

- Increase visual depth for `.panel`, `.metric-card`, `.topbar`, `.queue-table-wrap`, `.form-section`, `.inspector`, and public passport surfaces.
- Add reusable classes for premium pilot surfaces, such as:
  - `hero-panel` for high-emphasis page introductions.
  - `surface-grid` for dashboard/review sections.
  - `insight-card` for compact context cards.
  - `action-rail` for guided next steps.
  - `trust-report-shell` for public passport presentation.
- Keep responsive behavior simple and CSS-only.
- Maintain accessible contrast, visible focus states, and readable text sizes.

## Route-Level UX Changes

### Dashboard `/`

Make the dashboard feel like the primary command center:

- Give the top area stronger hierarchy with a richer topbar/hero treatment.
- Make metrics feel more substantial with clearer labels, accent treatments, and better value hierarchy.
- Keep the case queue central but improve row scanability.
- Make the right-hand panels feel like an operator rail, not loose cards.
- Keep all recent recommendation-only pilot copy.

### Case Detail `/cases/[id]`

Make case detail feel like an evidence review workspace:

- Improve visual separation between agreement, evidence, recommendation, proof state, and operator brief.
- Make recommendation/proof panels feel like decision support, not final action execution.
- Make the local review button and GenLayer sections visually subordinate to operator decision context.
- Preserve existing copy that says LexNet does not custody funds, execute payouts, or finalize settlement.

### New Case `/cases/new`

Make intake feel guided:

- Keep the current single submit flow and validation.
- Add a more polished header/context panel around the form.
- Improve form sections so parties, agreement, and acceptance criteria feel like steps in an intake process.
- Add lightweight guidance/expectation copy using existing data and no new persistence.

### Passports `/passports`

Make passport management feel more like an operator surface:

- Strengthen publication model panel and passport cards.
- Make backend vs local demo state more visually distinct.
- Keep publication controls and API behavior unchanged.
- Keep public preview language privacy-safe and aggregate-only.

### Public Passport `/passport/[slug]`

Make public passports feel intentionally shareable:

- Present the public passport as a compact trust report/card.
- Elevate redacted subject, trust level, metrics, and privacy boundary chips.
- Preserve aggregate-only data and avoid raw parties, evidence URLs, private case IDs, audit events, workspace data, or payout status.

## Data Flow

No data-flow changes are required.

- Continue using seeded `.lexnet-data` pilot records and existing domain helpers.
- Continue using local browser fallback where existing components already do.
- Continue using demo-private APIs and public passport APIs as currently implemented.
- Do not add new server actions, API routes, persistence adapters, or auth gates.

## Error Handling

- Existing validation and unavailable-backend messaging should remain.
- Visual polish should make empty/local-only states clearer, not hide them.
- Browser console errors during the pilot walkthrough are regressions.
- Normal dev-mode warnings remain acceptable.

## Testing And Verification

Run after implementation:

```bash
npm --prefix frontend run test:domain
npm --prefix frontend run test:platform
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
npm --prefix frontend run pilot:check
```

Browser-check at least:

- `/`
- `/cases/lx-case-demo-settlement`
- `/cases/new`
- `/passports`
- `/passport/buyer-0x4f9a-lexnet-d86156e8`

Expected browser results:

- UI feels more polished and less sparse on all active pilot surfaces.
- Dashboard reads as a command center.
- Case detail reads as an evidence review workspace.
- New case reads as guided intake.
- Passports reads as operator trust management.
- Public passport reads as a shareable privacy-safe trust signal.
- No console errors, excluding normal dev-mode warnings.

## Success Criteria

- The app visibly feels more mature without changing core behavior.
- All active pilot routes share a more cohesive visual language.
- No production infrastructure or payment/custody/finality claims are introduced.
- Public passport remains privacy-safe and aggregate-only.
- Verification commands and browser walkthrough pass before implementation is considered complete.

## Self-Review

- Placeholder scan: no TBD/TODO/fill-in sections remain.
- Scope check: this is a single visual polish batch, not Phase G production foundation.
- Consistency check: route-level changes reuse current components and CSS classes instead of adding new dependencies.
- Risk check: the spec preserves recommendation-only, privacy, and no-custody/no-payout/no-finality boundaries.
