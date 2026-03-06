# ACTION_PLAN - Codex 0.111 + GPT-5.4 Compatibility + Adoption Realignment (1012)

## Phase 1 - Docs-First Foundation
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for task 1012.
- [x] Capture a findings document with local runtime probes plus official-docs evidence.
- [x] Register 1012 in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Phase 2 - Compatibility Decision
- [x] Record the `gpt-5.4` baseline decision for ChatGPT-auth operation.
- [x] Explicitly hold `gpt-5.4-codex` from default review/high-reasoning role adoption.
- [x] Preserve `explorer_fast` and RLM/alignment model pins in this lane.

## Phase 3 - Local Runtime Repair
- [x] Update the live local review/custom-role surfaces away from unsupported `gpt-5.4-codex` and onto `gpt-5.4`.
- [x] Capture before/after config evidence and post-repair smoke checks.
- [x] Record any temporary delegation override reason used before the repair lands. No delegation override was needed; the only temporary workaround was a docs-review `CODEX_HOME` copy before the live parser fix landed.

## Phase 4 - Repo Baseline Realignment
- [x] Update starter config, defaults setup, doctor advisory, and baseline docs to the `gpt-5.4` model contract.
- [x] Refresh version-policy guidance from stale `0.107.0` language to the current task-scoped `0.111.0` compatibility posture.
- [x] Update affected tests to match the new baseline contract.

## Phase 5 - Validation + Closeout
- [x] Run docs-review plus the ordered validation chain.
- [x] Run explicit elegance review.
- [x] Run manual simulated/mock usage checks and capture summary evidence.
- [x] Capture the succeeded authoritative implementation-gate manifest, downstream `pack:smoke` summary, and carry-forward note for broader control-surface findings. Evidence: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/2026-03-06T00-27-39-186Z-2b3367e1/manifest.json`, `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260306T004500Z-closeout/00-closeout-summary.md`.

## Boundaries
- No `gpt-5.4-codex` default flip while ChatGPT auth rejects it.
- No broad RLM or `explorer_fast` model changes in this lane.
- Continue to the next Coordinator slice only after this compatibility lane is evidence-backed.
