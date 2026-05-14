# Task Checklist - linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba

- Linear Issue: `CO-161` / `d26b2799-a4a1-41d0-87cb-ee64eabcdbba`
- MCP Task ID: `linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba`
- Primary PRD: `docs/PRD-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`
- TECH_SPEC: `tasks/specs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`

## Docs-First
- [x] PRD drafted for the released-claim fresh-discovery suppression follow-up lane. Evidence: `docs/PRD-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [x] TECH_SPEC drafted with the narrow release-only suppression seam and proof-first contract. Evidence: `tasks/specs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`, `docs/TECH_SPEC-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [x] ACTION_PLAN drafted for proof, minimal implementation, regressions, and review handoff. Evidence: `docs/ACTION_PLAN-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` updated with the six `linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba` artifact entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot while keeping the active snapshot file within the line budget by archiving one completed historical entry. Evidence: `docs/TASKS.md`, `docs/TASKS-archive-2026.md`.
- [x] Checklist mirror updated across `/tasks` and `.agent/task`. Evidence: `tasks/tasks-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`, `.agent/task/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [x] Audited docs-review evidence captured for `linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba`. Evidence: `../../.runs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba-co-161-docs-review/cli/2026-04-13T10-22-31-837Z-45c76cb6/manifest.json`.

## Implementation
- [x] Reproduced that released-only deferred-poll skip reasons suppressed discovery of unrelated runnable issues when the retained claim set was fully released on the pre-fix tree. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] Separated release-only local fail-closed handling from global fresh-discovery suppression without reintroducing retained released direct reads. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] Preserved `CO-160` retained released local-first behavior and kept non-released cached suppression unchanged. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.

## Validation
- [x] Focused regressions cover both the retained all-released local-first case and the mixed/unrelated runnable discovery case. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `npm run build`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `npm run lint`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `npm run test`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `npm run docs:check`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `npm run repo:stewardship`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] `npm run review`. Evidence: `../../.runs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/cli/2026-04-13T10-09-14-117Z-78f2d60e/review/output.log`, `../../.runs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/cli/2026-04-13T10-09-14-117Z-78f2d60e/review/telemetry.json`.
- [x] `npm run pack:smoke`. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.

## Handoff
- [x] Workpad refreshed with proof, implementation scope, validation truth, and review status. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] PR attached to the Linear issue before review-state transition. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `out/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba/manual/workpad.md`.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending `Core Lane` rerun completion and clean `pr ready-review` drain.
- [ ] Issue moved to the actual team review state (`In Review` or `Human Review`) only after coding stops. Evidence: pending.
