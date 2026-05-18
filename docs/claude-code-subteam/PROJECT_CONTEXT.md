# Claude Code Subteam Orchestration

## Mission

Use Claude Code as parallel engineering subteams for LexNet while Codex acts as project manager, tech lead, integrator, and reviewer.

## Operating Model

- Codex owns task slicing, architecture guardrails, integration, review, and final verification.
- Claude Code agents own bounded work packages with explicit file ownership.
- Each agent works in its own branch or worktree and must avoid files owned by another agent.
- Every agent returns changed files, rationale, commands run, risks, and follow-up notes.
- No agent may claim custody, payout execution, escrow completion, or settlement finality unless scope explicitly changes.

## LexNet Context

- Product: AI-verified commerce trust platform.
- Current posture: recommendation-only pilot/demo workflow.
- Frontend: Next.js App Router in `frontend/src/app`.
- Components: `frontend/src/components`.
- Domain logic: `frontend/src/lib/lexnet-*.ts`.
- Platform backend: `frontend/src/lib/platform`.
- Contract boundary: `contracts/lexnet_commerce_core.py`.
- Reference docs: `CLAUDE.md`, `ARCHITECTURE.md`, `docs/CURRENT_MAP.md`.

## Non-Negotiables

- Do not edit `genlayer-js` unless explicitly requested.
- Do not commit `.lexnet-data`, `.env.local`, secrets, private keys, or local output artifacts.
- Do not overwrite user changes in the active worktree.
- Keep changes small, reviewable, and aligned with existing style.
- Prefer tests only for changed behavior. If user says skip tests, report that verification is skipped.

## Default Claude Code Runtime

```powershell
claude -p "<prompt>" --model opus --effort xhigh --output-format text
```

Use `--permission-mode dontAsk` only in isolated worktrees where the agent has a bounded write scope.
Use read-only tool sets for audit tasks.
