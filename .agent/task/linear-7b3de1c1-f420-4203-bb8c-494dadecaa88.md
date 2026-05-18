# Task Checklist Mirror - linear-7b3de1c1-f420-4203-bb8c-494dadecaa88

Canonical checklist: `tasks/tasks-linear-7b3de1c1-f420-4203-bb8c-494dadecaa88.md`.

## Current Status
- [x] Live issue context inspected; `Ready` moved to `In Progress`; single workpad comment created.
- [x] Matrix-backed `parallelize_now` decision recorded for CO-319.
- [x] Same-issue child lane `docs-packet-core` completed successfully and was invalidated because it preserved the wrong fallback evidence set.
- [x] Parent checklist/mirror scaffolding exists for CO-319.
- [x] Canonical owner follow-up issue `CO-320` is created via the `Backlog` path with the exact cohort key and marker, and current live issue-context now shows it in `In Progress`.
- [x] Packet docs and registry mirrors are updated with the returned owner evidence.
- [x] Docs-review plus truthful validation/review evidence are recorded, and draft PR `#610` is attached on the restacked head. Review handoff is still pending because the PR remains draft and GitHub checks plus `pr ready-review` have not drained cleanly yet. Evidence: `https://github.com/Kbediako/CO/pull/610`, `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/cli/2026-04-23T01-27-41-396Z-fb6749c4/review/telemetry.json`, `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/docs-review-fallback.md`, and `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/elegance-review.md`.

## Guardrails
- Preserve the exact canonical owner key and marker for the Mar 23 task-packet cohort.
- Do not reopen terminal `CO-300`.
- Do not weaken `docs:freshness` or `docs:freshness:maintain`.
- Do not broaden CO-318 into the historical refresh itself.
- Keep parent changes out of the child lane's delegated packet-core files until accept/reject/invalidate.

## Escalation Path
- Escalate to the CO product owner for scope/acceptance conflicts, the on-call orchestrator maintainer for workflow or CI breakage, and the parent provider worker as fallback owner for same-turn lane-control decisions.
- Trigger escalation when canonical owner evidence drifts across `tasks/tasks-*`, `docs/TASKS.md`, `tasks/index.json`, or `docs/docs-freshness-registry.json`; when any change would reopen `CO-300` or weaken `docs:freshness`; or when PR/review automation blocks truthful handoff.
- Response policy: pause further branch mutation, record the blocker in the active Linear workpad, capture the relevant run evidence path, and wait for an explicit accept/reject/invalidate or scope decision before proceeding.
- Run evidence for this lane lives under `.runs/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/` and `out/linear-7b3de1c1-f420-4203-bb8c-494dadecaa88/manual/`.
- Example flow: if a proposed fix would broaden the Mar 23 task-packet canonical owner/marker or change the preserved `CO-300` / `CO-318` constraints, stop, log the conflict in the CO-319 workpad, attach the relevant `.runs/...` or `out/...` evidence, and escalate before another commit or review-state transition.
