# PRD — Orchestrator Issue Validation & Prioritization (Task 0901)

## Summary
- Problem Statement: A cross‑repo code review surfaced multiple reliability risks spanning CLI orchestration, unified exec, persistence, instruction loading, evaluation harness behavior, and tooling side effects. These findings need concrete validation (repro steps, expected vs. actual behavior, impact) before we change production code.
- Desired Outcome: For each identified issue, capture validation evidence, decide disposition (fix now, defer, or accept), and produce a prioritized follow‑up fix plan.

## Goals
- Reproduce or otherwise confirm each of the nine issues with minimal, targeted validation runs/tests.
- Record evidence in `.runs/0901-orchestrator-issue-validation/cli/<run-id>/manifest.json` and mirror in `out/0901-orchestrator-issue-validation/state.json`.
- Produce a triaged backlog with severity/priority and explicit acceptance criteria for any follow‑up fixes.

## Non‑Goals
- Implementing fixes in this task (tracked in a follow‑on hardening task/PR).
- Large refactors or API changes beyond what is required for validation.
- Re‑scoping existing tasks (0202/0303/0801) unless a validated issue is clearly in‑scope there.

## Scope & Candidates
Validated issues to confirm:
1. Sub‑pipeline errors can leave manifests/stages stuck “running”. `orchestrator/src/cli/orchestrator.ts:499-515`.
2. CLI exec executor ignores `args` passed by unified exec runtime. `orchestrator/src/cli/services/execRuntime.ts:30-36`.
3. Reused exec sessions ignore environment overrides on reuse. `packages/orchestrator/src/exec/session-manager.ts:104-110`.
4. Lock retry config may be clobbered by `undefined` values. `orchestrator/src/persistence/TaskStateStore.ts:49-55`, `orchestrator/src/persistence/ExperienceStore.ts:84-91`.
5. ISO date “validation” is too permissive for callers that require strict ISO‑8601. `packages/shared/manifest/artifactUtils.ts:20-23`.
6. Instruction loading hard‑fails on unstamped `AGENTS.md` candidates. `packages/orchestrator/src/instructions/loader.ts:55-70`.
7. Evaluation harness timeout kill uses `SIGKILL` unconditionally (not Windows‑safe). `evaluation/harness/index.ts:200-203`.
8. Temp artifact directories are never cleaned up in crystalizer + SDK exec. `orchestrator/src/learning/crystalizer.ts:153-160`, `packages/sdk-node/src/orchestrator.ts:103-107`.
9. ESLint plugin triggers `npm run build:patterns` as a side effect of linting. `eslint-plugin-patterns/index.cjs:40-48`.

## Stakeholders
- Product/Infra: Platform Enablement (Alex Rivera)
- Engineering: Orchestrator Reliability (Jamie Chen)
- Reviewers: Orchestrator maintainers + toolchain owners

## Success Metrics & Guardrails
- 9/9 issues have a recorded validation status with evidence links.
- Diagnostics/guardrails (`node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`) remain green for validation runs.
- Validation artifacts remain lightweight (no large archives checked in; store heavy artifacts under `.runs/0901-orchestrator-issue-validation/` only).
- Validation commands must be non‑interactive (no TTY); use no‑prompt flags or scripted input per `AGENTS.md` so runs never hang waiting for input.
- Default approval posture is the safe `read/edit/run/network` profile; record any escalations in the run manifest `approvals` array before proceeding.

## User Experience
- Engineers get a clear, reproducible bug list with priorities before code changes land.
- Reviewers can audit evidence quickly via linked manifests and state snapshots.

## Approvals
- Product/Infra: _(pending)_
- Engineering: _(pending)_
- Review: _(pending)_

## Evidence & Manifests
- Diagnostics/plan manifest: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- Metrics/state snapshots: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
