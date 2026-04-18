# Task Checklist - linear-42debc45-fa05-4a0a-a7bb-35a48153aea9

- Linear Issue: `CO-241` / `42debc45-fa05-4a0a-a7bb-35a48153aea9`
- MCP Task ID: `linear-42debc45-fa05-4a0a-a7bb-35a48153aea9`
- Primary PRD: `docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- TECH_SPEC: `tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`
- Shared source 0 anchor: `ctx:sha256:63b0749832e8a186a955a92d8fd3c5f60eb8d06d28e3a02f3006b2838e802175#chunk:c000001`
- Current origin manifest: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-packet/cli/2026-04-18T15-12-30-748Z-ea3efd2f/manifest.json`
- Source payload note: expected `source-0/source.txt` is absent in this child checkout.

## Docs-First
- [x] PRD drafted for reconciling `.runs/**/manifest.json` active-looking status with `provider-intake-state.json` lifecycle truth and child-lane ledger truth. Evidence: `docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, wrong interpretations to reject, explicit non-goals, and parent-owned implementation seams. Evidence: `tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md`, `docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`.
- [x] `tasks/index.json` updated within the declared docs scope. Evidence: `tasks/index.json`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] `.runs/**/manifest.json` files with `status=in_progress` or `status=launching` are not counted as active when newer truth shows they are orphaned, released, removed, invalidated, or rejected. Evidence: `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] `provider-intake-state.json` `released` / `removed` truth is reconciled with retained manifest status without deleting artifacts. Evidence: `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Child-lane ledger truth for `invalidated` and `rejected` lanes remains authoritative even when child output artifacts exist. Evidence: `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Stale `status=launching` placeholders are repaired, retired, or explicitly classified so they do not block capacity forever. Evidence: `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] File-based audit truth remains durable and inspectable. Evidence: `provider-linear-worker-reconciliation.json` sidecar assertions in `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Genuinely live `status=in_progress` and `status=launching` runs remain visible. Evidence: `npm run test`.

## Validation
- [x] Child scoped JSON parse check. Evidence: `python3 -m json.tool tasks/index.json >/tmp/co-241-index.json`.
- [x] Child scoped protected-term check over the packet. Evidence: `rg -n "\\.runs/\\*\\*/manifest\\.json|status=in_progress|status=launching|provider-intake-state\\.json|orphaned|released|removed|invalidated|rejected|file-based audit truth|child-lane ledger truth" docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/TECH_SPEC-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md docs/ACTION_PLAN-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md tasks/specs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-run-artifact-truth.md tasks/tasks-linear-42debc45-fa05-4a0a-a7bb-35a48153aea9.md tasks/index.json` plus no-index `git diff --check` over each new untracked packet file.
- [x] Child docs-focused spec guard. Evidence: `node scripts/spec-guard.mjs --dry-run`.
- [x] Child docs-focused docs check. Evidence: `npm run docs:check`.
- [x] Child docs-focused freshness check. Evidence: `npm run docs:freshness`.
- [x] Child docs-focused diff budget check. Evidence: `node scripts/diff-budget.mjs`.
- [x] Parent focused child-lane placeholder and invalidation/rejection tests. Evidence: `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Parent focused provider-run manifest orphan classification tests. Evidence: `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Parent focused active projection/status tests proving genuine live runs stay visible. Evidence: `npm run test`.
- [x] Parent docs-review before implementation. Evidence: `.runs/linear-42debc45-fa05-4a0a-a7bb-35a48153aea9-docs-review/cli/2026-04-18T15-25-19-379Z-47cd5869/manifest.json`.
- [x] Parent-selected scoped validation after source edits. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.

## Progress Log
- 2026-04-18: bounded same-issue docs child lane created the `CO-241` docs-first packet and registry entry against source anchor `ctx:sha256:63b0749832e8a186a955a92d8fd3c5f60eb8d06d28e3a02f3006b2838e802175#chunk:c000001`. The expected shared source payload is absent in this child checkout, so the packet is anchored on the protected parent prompt terms: `.runs/**/manifest.json`, `status=in_progress`, `status=launching`, `provider-intake-state.json`, `orphaned / released / removed / invalidated / rejected`, file-based audit truth, and child-lane ledger truth.
