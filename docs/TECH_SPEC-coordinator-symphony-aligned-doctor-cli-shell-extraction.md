# TECH_SPEC: Coordinator Symphony-Aligned Doctor CLI Shell Extraction

## Scope

Bounded extraction of the `doctor` command shell that still lives inline in `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- a new dedicated doctor shell/helper module under the orchestrator CLI sources
- `tests/cli-command-surface.spec.ts`
- adjacent focused tests only if parity coverage needs to move with the seam

## Requirements

1. Extract `handleDoctor(...)` orchestration out of the top-level CLI file without changing user-facing doctor behavior.
2. Preserve current flag validation, readiness/usage/cloud-preflight/issue-log composition, JSON/text output shaping, and `--apply` planning/apply contracts.
3. Keep `runDoctor(...)`, `runDoctorUsage(...)`, `runDoctorCloudPreflight(...)`, `writeDoctorIssueLog(...)`, `installSkills(...)`, `runDelegationSetup(...)`, and `runDevtoolsSetup(...)` in their current modules.
4. Keep unrelated sibling handlers unchanged except for import rewiring.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused doctor coverage in `tests/cli-command-surface.spec.ts`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the doctor command shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
