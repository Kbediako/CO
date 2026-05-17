# Task Checklist - linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1

- Linear Issue: `CO-199` / `2a8f00cf-a39a-4b15-aeca-23bacd618af1`
- MCP Task ID: `linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1`
- Primary PRD: `docs/PRD-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`
- Task spec: `tasks/specs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`

## Docs-First
- [x] PRD drafted for CO-199 sandbox/security local-cloud preflight policy classification. Evidence: `docs/PRD-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, classification requirements, and validation plan. Evidence: `docs/TECH_SPEC-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`, `tasks/specs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`.
- [x] Task mirrors and registries updated for the child-lane docs packet. Evidence: `tasks/tasks-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`, `.agent/task/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Parent docs-review evidence captured before implementation; actionable findings were nested checkout cleanup, 1048 TASKS archive preservation, and missing `thread/shellCommand` row. Evidence: `.runs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1-docs-review-r2/cli/2026-04-16T03-25-27-353Z-a6d7d89c/manifest.json`.

## Source / Assumptions
- [x] CO-195 packet used as nearest local structure pattern. Evidence: `docs/PRD-linear-4122489e-1a3b-43cf-a181-e98ada0a55e1.md`, `docs/TECH_SPEC-linear-4122489e-1a3b-43cf-a181-e98ada0a55e1.md`, `tasks/specs/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1.md`.
- [x] Child-lane missing source-0 payload recorded as a parent reconciliation item. Evidence: child workspace had no source payload during `.runs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1-docs-packet/cli/2026-04-16T03-13-02-677Z-106c327d/manifest.json`.
- [x] Parent confirms source-0 payload does not add or change sandbox/security classification rows. Evidence: `../../.runs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1/cli/2026-04-16T03-09-04-252Z-6d0539ae/memory/source-0/source.txt` contains run metadata and prompt-pack provenance only.

## Classification / Implementation
- [x] Final classification matrix drafted with `local-only`, `cloud-only`, `both`, and `not applicable` buckets. Evidence: `docs/PRD-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`, `docs/TECH_SPEC-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md`, `docs/guides/cloud-mode-preflight.md`.
- [x] Parent identifies the exact docs/policy/test surfaces to update from the matrix. Evidence: `docs/guides/cloud-mode-preflight.md`, `docs/guides/codex-version-policy.md`, `orchestrator/src/cli/doctor.ts`, `orchestrator/tests/Doctor.test.ts`.
- [x] Parent implementation preserves no credential/profile rotation fixes, no sandbox default weakening, and no broad cloud runtime redesign. Evidence: `orchestrator/src/cli/doctor.ts` adds advisory-only diagnostics and does not change cloud preflight failure/pass conditions.
- [x] Parent verifies local-only rows do not become cloud blockers without cloud evidence. Evidence: `security_advisories` is separate from `issues` and `ok` in `DoctorCloudPreflightResult`.
- [x] Parent verifies cloud-only rows do not alter local sandbox defaults. Evidence: remote exec environment policy remains documented as cloud-only with unchanged runtime fail-fast rules.

## Validation
- [x] Child scoped JSON parse and registry/path checks pass. Evidence: local child command output.
- [x] `node scripts/delegation-guard.mjs`. Evidence: 4 subagent manifests detected.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed.
- [x] Focused parent tests for changed preflight classification/policy surfaces. Evidence: `npm run build`; `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts` (46 passed).
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: passed.
- [x] `npm run test`. Evidence: passed, 342 files / 3939 tests.
- [x] `npm run docs:check`. Evidence: passed.
- [x] `npm run docs:freshness`. Evidence: passed, 3934 docs / 3937 registry entries.
- [x] `npm run repo:stewardship`. Evidence: passed, 5022 tracked files with 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed after closeout metadata refresh, files=12/25 and lines=723/1200.
- [x] `npm run pack:smoke`. Evidence: passed.
- [x] Manifest-backed implementation-gate. Evidence: `.runs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1-implementation-gate/cli/2026-04-16T03-50-40-046Z-96d42245/manifest.json`, `review_outcome=clean-success`.
- [x] Manifest-backed standalone review. Evidence: `.runs/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1-implementation-gate/cli/2026-04-16T03-50-40-046Z-96d42245/review/telemetry.json`, `review_outcome=bounded-success`.
- [x] Explicit elegance/minimality pass. Evidence: `out/linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1/manual/elegance-review.md`.

## Handoff Status
- [x] Child lane leaves docs/register changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent resolves `docs/TASKS.md` line-budget/archive follow-up after applying this packet. Evidence: `npm run docs:archive-tasks` preserved displaced 1048 snapshot entry in `docs/TASKS-archive-2026.md`; `npm run docs:check` passed.
- [ ] Parent opens PR, attaches it to Linear, runs `pr ready-review`, and transitions to review. Evidence: pending parent lane.
