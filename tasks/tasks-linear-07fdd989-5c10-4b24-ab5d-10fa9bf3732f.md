# Task List: CO-499 classify terminal Codex connector failures in ready-review

## Added by Traceability Packet 2026-05-05

## Context
- Linear issue: `CO-499`
- Linear issue id: `07fdd989-5c10-4b24-ab5d-10fa9bf3732f`
- MCP Task ID: `linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f`
- Primary PRD: `docs/PRD-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- TECH_SPEC: `tasks/specs/linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- Canonical owner key: `pr-ready-review-codex-terminal-failure-clearance`
- Summary of scope: classify terminal `chatgpt-codex-connector` failure comments in `ready-review` without weakening active Codex review waits, required checks, CodeRabbit gates, unresolved threads, or unacknowledged bot feedback.

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing evidence.

### Evidence Gates
- [x] Issue-quality review captured (pre-implementation) - Evidence: `tasks/specs/linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md` carries protected terms, wrong interpretations, explicit non-goals, parity matrix, and Not Done If clauses.
- [x] Fallback / refactor decision captured (pre-implementation) - Evidence: `tasks/specs/linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md` removes terminal-failure-as-pending and retains manual retry and hard review gates as explicit contracts.
- [x] Durable fallback retention evidence captured - Evidence: manual one-ping-per-head Codex retry and hard review gate separation are documented in the PRD, TECH_SPEC, and ACTION_PLAN.
- [ ] Docs-review manifest captured - Evidence: pending.
- [ ] Implementation review manifest captured - Evidence: pending.
- [ ] PR review handoff evidence captured - Evidence: pending.

### Progress Log
- 2026-05-05: Created traceability packet on branch `kb/co-499-traceability-packet` from current `origin/main` after live Linear confirmed CO-499 was still `Backlog`, no workpad existed, no PR was attached, and the prior Codex session summary was not present in local branches, run artifacts, or source.
- 2026-05-05: Packet preserves the user's live orchestration requirement to manually trigger Codex review when auto-trigger is missing while keeping repeated `@codex` pings out of the watcher.
- 2026-05-05: Registered packet mirrors in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`; validation passed `git diff --check`, JSON parse, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness`.

## Parent Tasks
1. Register traceability packet.
   - Files: PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
   - Acceptance: `backlog_head_follow_up_traceability_pending` has packet and registry evidence available on a PR-ready branch.
   - [x] Status: Complete. Evidence: `git diff --check`, JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness`.
2. Add terminal Codex connector failure classifier.
   - Files: `scripts/lib/pr-watch-merge.js`.
   - Acceptance: known `chatgpt-codex-connector` terminal failure response after current request does not remain plain `bot_rereview_pending=codex`.
   - [ ] Status: Pending.
3. Preserve active Codex review wait.
   - Files: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`.
   - Acceptance: active/in-progress Codex review evidence still blocks as pending.
   - [ ] Status: Pending.
4. Preserve independent review-readiness gates.
   - Files: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`.
   - Acceptance: required checks, merge state, unresolved threads, unacknowledged bot feedback, `CHANGES_REQUESTED`, and CodeRabbit gates remain independent blockers.
   - [ ] Status: Pending.
5. Add focused tests and run validation.
   - Files: `tests/pr-watch-merge.spec.ts`.
   - Acceptance: terminal failure, active pending, stale failure/newer request, and existing gate preservation coverage are green.
   - [ ] Status: Pending.
6. Parent-owned review and handoff.
   - Files: parent lane manifests, workpad, PR, and review artifacts.
   - Acceptance: PR checks and review feedback are clean; Codex auto-review signal is verified or manually triggered once for the current head; Linear transitions only after ready-review is clean.
   - [ ] Status: Pending.

## Relevant Files
- `docs/PRD-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- `docs/TECH_SPEC-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- `docs/ACTION_PLAN-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- `tasks/specs/linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- `tasks/tasks-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- `.agent/task/linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- `scripts/lib/pr-watch-merge.js` (parent implementation)
- `tests/pr-watch-merge.spec.ts` (parent implementation)

## Notes
- CO-499 is a follow-up from CO-475 PR #767 and must stay separate from CO-475 wording.
- The prior Linear Codex session summary is useful as a hypothesis only; no matching branch, PR, run artifact, or source implementation exists on current main.
- Parent orchestration should use the PR body reaction heuristic while supervising GitHub: `eyes` means Codex auto-review started, `+1` means approval, and missing reaction/terminal failure can require one manual `@codex review` ping per PR head SHA.
