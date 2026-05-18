# Claude Code Subteam Runbook

## 1. PM Intake

Codex performs intake before launching subteams:

1. Read `CLAUDE.md`, `ARCHITECTURE.md`, and `docs/CURRENT_MAP.md`.
2. Check `git status --short` and record existing user changes.
3. Split work by ownership boundary.
4. Create one task brief per subteam.
5. Decide if work is read-only audit, implementation, QA, or review.

## 2. Worktree Pattern

Recommended branch/worktree naming:

```powershell
git worktree add ..\LexNet-agent-frontend -b agent/frontend-<task>
git worktree add ..\LexNet-agent-platform -b agent/platform-<task>
git worktree add ..\LexNet-agent-web3 -b agent/web3-<task>
git worktree add ..\LexNet-agent-qa -b agent/qa-<task>
```

Each Claude Code instance runs inside its own worktree. Codex later reviews and ports changes back intentionally.

## 3. Agent Launch Pattern

```powershell
.\scripts\run-claude-subteam.ps1 -Agent frontend
```

For implementation tasks, include exact owned files in the prompt before launch.

## 3.1 Session Persistence Rule

Keep one long-lived Claude Code session per subteam. Do not start a fresh session for every task unless context is corrupted or PM explicitly requests reset.

- Session IDs live under `.claude/subteam-sessions/`.
- `.claude/` is git-ignored, so session state stays local.
- The runner automatically uses `--resume` after the first run for each agent.
- Use `-NewSession` only when an agent context is stale, wrong, or too expensive to repair.

```powershell
.\scripts\run-claude-subteam.ps1 -Agent web3-contract
.\scripts\run-claude-subteam.ps1 -Agent web3-contract -NewSession
```

## 4. Integration Gate

Before accepting a subteam diff, Codex checks:

- Scope stayed inside owned files.
- No unrelated refactors.
- No secret or generated artifact committed.
- Product copy remains recommendation-only.
- Tests/build commands are either run or explicitly skipped by user instruction.

## 5. Handoff Format

Every subteam must return:

```text
Summary:
Changed files:
Tests/verification:
Risks:
Next recommended task:
```

## 6. PM Cadence

- Use Architect Agent for repo maps and risk inventory.
- Use Frontend Agent for UI and app route slices.
- Use Platform/API Agent for `frontend/src/lib/platform` and API routes.
- Use Web3/Contract Agent for GenLayer adapters and `contracts`.
- Use QA Agent after implementation slices land.
- Use Security Agent before production-readiness claims.
