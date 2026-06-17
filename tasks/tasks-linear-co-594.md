# Task Checklist - CO-594

- Linear Issue: `CO-594`
- MCP Task ID: `20260617-linear-co-594-co-594-consolidation`
- Primary PRD: `docs/PRD-linear-co-594.md`
- TECH_SPEC: `tasks/specs/linear-co-594.md`, `docs/TECH_SPEC-linear-co-594.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-co-594.md`

## Docs-First
- [x] Linear access verified after plugin enablement. Evidence: `CO` team, `CO Control and Advisory` project, and open issue inventory were read on 2026-06-17.
- [x] Canonical Linear issue created. Evidence: `CO-594` / `https://linear.app/asabeko/issue/CO-594/co-consolidate-linear-backlog-and-ponytail-refactor`.
- [x] Source issue provenance preserved with identifier, title, Linear link, status, assignee, priority, labels, project membership, and rationale. Evidence: `docs/PRD-linear-co-594.md` Source Inventory and `CO-594` description; source statuses unchanged.
- [x] PRD drafted. Evidence: `docs/PRD-linear-co-594.md`.
- [x] TECH_SPEC drafted. Evidence: `tasks/specs/linear-co-594.md`, `docs/TECH_SPEC-linear-co-594.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-co-594.md`.
- [x] `tasks/index.json` updated. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-co-594.md`. Evidence: `.agent/task/linear-co-594.md`.
- [x] Docs-review completed before implementation edits. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/manifest.json`.

## Subagents
- [x] Linear inventory/provenance subagent completed read-only inventory. Evidence: subagent `019ed33b-5fbb-7933-8af8-bcfd3764ace5`.
- [x] Current Codex/OpenAI posture subagent completed official-doc/local CLI verification. Evidence: subagent `019ed33c-770a-7f50-8919-119590755856`.
- [x] Ponytail audit subagent completed. Evidence: subagent `019ed33d-ded0-7a80-875f-95b49dc475ad`.
- [x] Refactor planning subagent completed. Evidence: subagents `019ed39f-e649-7b93-9bf5-d960ac09759b`, `019ed3a0-0b1d-7680-8b48-8aa9a3ab90b0`.
- [x] Implementation streams completed. Evidence: subagents `019ed3a7-43f9-7391-86c0-7bae4b18cf4b`, `019ed3b1-868f-7703-8fa9-2da304881b66`.
- [x] Validation/review stream completed. Evidence: subagents `019ed3ac-44c3-7103-a798-ecb8f3a67bfb`, `019ed3d0-3c38-7801-a08c-fad3599a0b56`, `019ed3d2-bb9e-77d0-af6d-6e7786003c3b`; final standalone review telemetry `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/review/telemetry.json`.

## Implementation Gate
- [x] Docs-review passed. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/manifest.json`.
- [x] Ponytail audit targets selected. Targets: remove the dependency-missing custom TOML subset parser from `orchestrator/src/cli/config/delegationConfig.ts`; remove the expired CO-485 review-wrapper legacy sandbox retry.
- [x] Small behavior-preserving implementations completed. Evidence: `orchestrator/src/cli/config/delegationConfig.ts`, `orchestrator/tests/DelegationConfig.test.ts`, `scripts/lib/review-launch-attempt.ts`, `tests/review-launch-attempt.spec.ts`, `scripts/run-review.ts`, `tests/run-review.spec.ts`, `docs/standalone-review-guide.md`.
- [x] Non-trivial logic has runnable validation. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/DelegationConfig.test.ts` passed with 18 tests; implementation worker reported `npx vitest run --config vitest.config.core.ts tests/review-launch-attempt.spec.ts` passed with 20 tests and `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts` passed with 188 tests.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed with 7 subagent manifests using `MCP_RUNNER_TASK_ID=20260617-linear-co-594-co-594-consolidation`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed after CO-579 freshness remediation and implementation updates.
- [x] `npm run build`. Evidence: passed after the final review-wrapper telemetry fix.
- [x] `npm run lint`. Evidence: passed after the final review-wrapper telemetry fix with existing warnings only in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: passed after the final review-wrapper telemetry fix with 367 files and 6438 tests.
- [x] `npm run docs:check`. Evidence: passed after implementation.
- [x] `npm run docs:freshness`. Evidence: passed with 5721 docs, 5725 registry entries, stale=0.
- [x] `npm run repo:stewardship`. Evidence: passed with 6870 tracked files and 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed with explicit override for user-authorized CO-579 freshness remediation plus CO-594 provenance/refactor scope; changed-file count is docs-registry/spec dominated, not validation deletion.
- [x] `codex-orchestrator review` or `npm run review`. Evidence: final enforce-mode standalone review passed clean with valid contract and 0 findings; telemetry `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/review/telemetry.json`.
- [x] `npm run pack:smoke` if CLI/package/skills/review-wrapper surfaces are touched. Evidence: passed after the final telemetry fix.
- [x] Elegance review completed. Evidence: subagent `019ed3d0-3c38-7801-a08c-fad3599a0b56` rechecked the command-intent telemetry fix and reported no findings.

## Not Done If
- Source issue provenance is missing.
- Implementation starts before docs-review.
- Final diff increases bloat or weakens validation.
- Source issues are bulk-closed or source tests/docs are deleted to game LOC.
