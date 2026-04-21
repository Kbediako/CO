# Task Checklist: CO-268 marketplace docs and smoke coverage rebaseline to Codex 0.122 plugin marketplace commands

## Scope

- Task id: `linear-904f74a5-e1b6-4740-a0df-8c92ec73314b`
- Registry id: `20260421-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b`
- Linear issue: `CO-268`
- Issue id: `904f74a5-e1b6-4740-a0df-8c92ec73314b`
- Child lane: `docs-surface` for `README.md` and `docs/public/downstream-setup.md`
- Parent lane owns docs packet, workpad, launcher guidance, smoke logic/tests/workflows, validation, PR lifecycle, and merge

## Owned Files

- `docs/PRD-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- `docs/TECH_SPEC-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- `docs/ACTION_PLAN-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- `tasks/specs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- `tasks/tasks-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- `.agent/task/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`
- `plugins/codex-orchestrator/launcher.mjs`
- `scripts/pack-smoke.mjs`
- `tests/pack-smoke.spec.ts`
- `.github/workflows/core-lane.yml`
- `.github/workflows/pack-smoke-backstop.yml`
- `.github/workflows/release.yml`

## Issue-Quality Review

- [x] Scope stays a command-surface rebaseline, not a packaging redesign.
- [x] npm remains the supported baseline install path.
- [x] `CO-196` lineage remains explicit.
- [x] Related smoke workflow pin updates are included because the existing test contract enforces them.

## Docs Checklist

- [x] PRD created at `docs/PRD-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] TECH_SPEC created at `docs/TECH_SPEC-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] ACTION_PLAN created at `docs/ACTION_PLAN-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] Task spec mirror created at `tasks/specs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] Task checklist created at `tasks/tasks-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] Agent task mirror created at `.agent/task/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] Registry item added to `tasks/index.json`.
- [x] Snapshot entry added to `docs/TASKS.md`.
- [x] Freshness entries added to `docs/docs-freshness-registry.json`.

## Execution Checklist

- [ ] Maintain exactly one Linear workpad with decomposition matrix, acceptance criteria, validation, and milestone refreshes.
- [ ] Record the required parallelization decision and complete at least one successful same-issue child lane.
- [ ] Accept or manually apply the `docs-surface` child-lane patch.
- [ ] Update launcher guidance to `codex plugin marketplace add`.
- [ ] Update pack-smoke support detection and invocation to the `codex plugin marketplace` surface.
- [ ] Update related tests to the new command wording and smoke pin.
- [ ] Update smoke workflows to install `@openai/codex@0.122.0`.
- [ ] Preserve npm baseline guidance and packaged marketplace architecture.
- [ ] Capture explicit release/local command-surface evidence in workpad and validation notes.

## Validation Checklist

- [ ] `docs-review` manifest captured.
- [ ] Focused `tests/pack-smoke.spec.ts` validation passes.
- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `npm run repo:stewardship`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run pack:smoke`
- [ ] Standalone review completed.
- [ ] Elegance review completed.
