# Token Optimization Cleanup

## Summary

Reduce AI coding context waste by archiving stale docs, rewriting the architecture doc, creating a canonical project map, and adding search boundaries.

## Changes

### 1. Create `docs/CURRENT_MAP.md`
Short file (~40 lines) listing:
- Project description (one line)
- Active source files by area (contract, lib, components, routes, providers)
- Archived/deprecated areas to skip
- Key commands (dev, build, test)

### 2. Replace `ARCHITECTURE.md`
Rewrite to reflect LexNetCommerceCore commerce trust flow:
- State machine: ACTIVE → EVIDENCE_SUBMITTED → UNDER_AI_REVIEW → VERIFIED/REVISION_REQUESTED/DISPUTED/SETTLEMENT_RECOMMENDED
- Verification adapter pattern (local + contract facade)
- Browser-local storage model
- Route map
Keep under 80 lines. Remove all escrow/fund/dispute references.

### 3. Archive stale files to `docs/archive/`
Move (not delete):
- `docs/LEXNET_NEXT_PHASE.md`
- `docs/superpowers/specs/2026-05-11-project-completion-review-design.md`
- `docs/superpowers/specs/2026-05-11-testnet-verify-script-design.md`
- `docs/superpowers/specs/2026-05-12-full-production-roadmap-design.md`
- `tests/test_escrow_lifecycle.py`
- `tasks/PROGRESS_LOG.md`

### 4. Add `.claudeignore`
Exclude from Claude Code search context:
- `genlayer-js/`
- `docs/archive/`
- `.agent/`
- `.shared/`
- `frontend/node_modules/`
- `genlayer-js/node_modules/`

### 5. Create `CLAUDE.md`
Project-level instructions for AI agents:
- Read `docs/CURRENT_MAP.md` first for project orientation
- Active working directories
- Test command
- What NOT to read (archive, vendored SDK)

## What does NOT change
- No runtime code changes
- No dependency changes
- No behavior changes
- Archived files remain accessible, just out of default search scope
