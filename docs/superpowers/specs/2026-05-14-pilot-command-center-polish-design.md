# Pilot Command Center Polish Design

## Goal

Make the Phase F pilot feel like a coherent operator demo instead of a collection of screens. A fresh `pilot:prepare` plus `demo:dev` walkthrough should quickly explain LexNet's recommendation-only commerce trust story: intake, evidence review, AI recommendation, operator action, and privacy-safe trust passport.

## Scope

- Improve the dashboard `/` so it reads as a pilot command center with a clearer walkthrough, stronger case prioritization, and safer next-action language.
- Improve case detail `/cases/[id]` so each case highlights recommendation-only status, evidence quality, proof state, and the next operator action.
- Improve passports `/passports` so operators can distinguish backend published records from local draft/demo passports and understand public preview behavior.
- Preserve public passport `/passport/[slug]` as privacy-safe, shareable aggregate trust history.
- Avoid production infrastructure changes, custody/payment/finality claims, and broad visual redesigns outside the active pilot flow.

## Non-Goals

- No Phase G production auth, managed persistence, evidence retention, or observability implementation.
- No real settlement, payout, escrow, custody, or final on-chain claims.
- No dependency or design-system overhaul.
- No changes to vendored GenLayer SDK files.

## Approach

Use existing Next.js routes, components, seeded platform data, and domain helpers. The work should favor small, reviewable UI/copy improvements over new infrastructure. Any behavior changes need tests first. Visual polish should reuse the current card/sidebar style and only add focused sections that make the demo narrative clearer.

## Proposed UX Changes

### Dashboard

Add or strengthen a pilot walkthrough area that explains the flow in operator language:

1. Intake agreement.
2. Collect evidence.
3. Review AI recommendation.
4. Take operator next action.
5. Publish privacy-safe passport signals.

The dashboard should make high-priority cases and settlement-ready recommendations easy to discover without implying payment execution or settlement finality.

### Case Detail

Emphasize:

- Current recommendation status.
- Evidence quality summary.
- Local verification vs GenLayer proof state.
- Safe next operator action.

The page should keep action labels recommendation-only and should not suggest LexNet moves funds.

### Passports

Clarify:

- Published backend passport records can be previewed publicly.
- Local demo passports are derived from demo cases and need backend generation/publishing state before publication controls apply.
- Public previews are privacy-safe aggregate views.

### Public Passport

Keep the page minimal and privacy-safe, but ensure it feels intentionally shareable by highlighting aggregate verification signals and the absence of private case/evidence details.

## Data Flow

- Continue using `pilot:prepare` seeded `.lexnet-data/store.json` as the pilot data source.
- Continue using browser local fallback for local demo-created cases where current components already do so.
- Do not introduce new persistence or auth boundaries.
- API calls should continue to use demo-private operator headers where required.

## Error Handling

- Existing unavailable backend messaging should remain explicit and demo-safe.
- Empty or local-only states should explain what the operator can do next rather than appearing broken.
- Console errors during the pilot walkthrough are regressions.

## Testing And Verification

- Add or update domain/platform tests only when behavior changes.
- Run:
  - `npm --prefix frontend run test:domain`
  - `npm --prefix frontend run test:platform`
  - `npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit`
  - `npm --prefix frontend run build`
- Browser-check at least:
  - `/`
  - `/cases/lx-case-demo-settlement`
  - `/passports`
  - `/passport/buyer-0x4f9a-lexnet-d86156e8`
- Confirm no console errors on the checked pages, excluding normal dev-mode warnings.

## Success Criteria

- Fresh pilot walkthrough feels cohesive and demo-ready.
- Operator can understand the core product story from the dashboard and one case detail page.
- Passport publication/preview states are understandable.
- Public passport remains privacy-safe.
- No copy claims custody, payouts, escrow completion, or settlement finality.
- Verification commands and browser walkthrough pass before committing implementation.
