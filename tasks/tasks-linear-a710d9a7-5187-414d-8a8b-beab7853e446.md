# Task Checklist - linear-a710d9a7-5187-414d-8a8b-beab7853e446

- Linear Issue: `CO-239` / `a710d9a7-5187-414d-8a8b-beab7853e446`
- MCP Task ID: `linear-a710d9a7-5187-414d-8a8b-beab7853e446`
- Primary PRD: `docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- TECH_SPEC: `tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- Shared source 0 anchor: `ctx:sha256:0d82ad4fdf8297fae69d0937a0588fb2976cb0c927eb468ec132a5ff9c789318#chunk:c000001`
- Shared source payload path: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-packet/cli/2026-04-18T04-39-54-760Z-8c9db8b8/memory/source-0/source.txt`
- Current origin manifest: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-packet/cli/2026-04-18T04-39-54-760Z-8c9db8b8/manifest.json`

## Docs-First
- [x] PRD drafted for the Apr 18 docs:freshness baseline blocker with the Mar 18 `1289-1298` cohort, explicit CO-175 preservation, and protected freshness language. Evidence: `docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, explicit ownership split, and parent-owned implementation seams. Evidence: `tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`, `docs/TECH_SPEC-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`.
- [x] ACTION_PLAN drafted for parent implementation and validation only. Evidence: `docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`.
- [x] Checklist mirrored to `.agent/task/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`. Evidence: `.agent/task/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`.
- [x] Parent updated `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and `docs/guides/docs-freshness-cohorts.md` after accepting the packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `docs/guides/docs-freshness-cohorts.md`.
- [x] Parent docs-review evidence captured before implementation. Evidence: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/manual/20260418T045452Z-docs-review-fallback.md`, `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-review/cli/2026-04-18T04-54-52-884Z-199bc6b4/manifest.json`.

## Source / Assumptions
- [x] Shared source anchor recorded. Evidence: `ctx:sha256:0d82ad4fdf8297fae69d0937a0588fb2976cb0c927eb468ec132a5ff9c789318#chunk:c000001`.
- [x] Child lane confirmed the shared `source-0` payload is metadata-only for this child run. Evidence: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-packet/cli/2026-04-18T04-39-54-760Z-8c9db8b8/memory/source-0/source.txt`.
- [x] Child lane preserved live CO-239 wording and counts from the parent-owned read-only issue cache. Evidence: `/Users/kbediako/Code/CO/.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446/cli/2026-04-18T04-35-39-294Z-290af894/provider-linear-issue-context-cache.json`.
- [x] Parent and child ownership split recorded. Evidence: this checklist and `tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared six packet files. Evidence: final diff.
- [x] Child lane did not edit registry mirrors, cohort-guide files, `out/` artifacts, implementation files, or tests. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: final diff and task scope.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Parent Implementation
- [x] Reproduced the Apr 18 `docs:freshness` failure on clean current `main` and saved before artifacts under `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/`. Evidence: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness.json`, `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness.md`, `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/before/docs-freshness-maintenance.json`.
- [x] Classified the `70` blocking stale rows by doc class, path family, lineage, and disposition, including explicit relationship to the `221` CO-175 rolling rows. Evidence: `docs/findings/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-freshness-classification.md`.
- [x] Applied the smallest truthful reviewed disposition for the Mar 18 `1289-1298` cohort without weakening `docs:freshness` or hiding CO-175 rolling debt. Evidence: `docs/findings/linear-a710d9a7-5187-414d-8a8b-beab7853e446-docs-freshness-classification.md`, `docs/docs-freshness-registry.json`.
- [x] Restored a truthful green `docs:freshness` path for unrelated clean diffs while keeping non-scope debt fail-closed. Evidence: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/after/docs-freshness.json`, `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/after/docs-freshness-maintenance.json`.
- [x] Updated cohort guidance and owner evidence so future lanes can cite Apr 18 baseline ownership directly. Evidence: `docs/guides/docs-freshness-cohorts.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] Closed out with an explicit note on the remaining intentionally visible stale-looking debt and why it remains visible. Evidence: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/after/docs-freshness-maintenance.json`, `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/manual/workpad.md`.

## Validation
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "docs:freshness|CO-175|rolling freshness cohort|repo-wide freshness debt|per-PR diff health|Mar 18 cohort|Task Packet|Task Mirror|Report Only|machine-checkable evidence|1289-1298|70|221" docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/TECH_SPEC-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/tasks-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md .agent/task/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`.
- [x] Child scoped whitespace and diff check over the six packet files. Evidence: `git diff --check -- docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/TECH_SPEC-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md tasks/tasks-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md .agent/task/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`.
- [x] Parent `node scripts/spec-guard.mjs --dry-run` passed. Evidence: command rerun on 2026-04-18 in the issue workspace.
- [x] Parent `npm run docs:check` passed. Evidence: command rerun on 2026-04-18 in the issue workspace.
- [x] Parent `npm run docs:freshness` passed. Evidence: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/after/docs-freshness.json`, `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/after/docs-freshness.md`.
- [x] Parent `npm run docs:freshness:maintain` passed with owned rolling debt only. Evidence: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/after/docs-freshness-maintain-input.json`, `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/after/docs-freshness-maintenance.json`.
- [x] Parent standalone review completed as bounded success via command-intent retry. Evidence: `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446/cli/2026-04-18T19-45-01-387Z-d47cc337/review/telemetry.json`, `.runs/linear-a710d9a7-5187-414d-8a8b-beab7853e446/cli/2026-04-18T19-45-01-387Z-d47cc337/review/output.log`.
- [x] Parent elegance or minimality pass recorded. Evidence: `out/linear-a710d9a7-5187-414d-8a8b-beab7853e446/manual/20260418T195521Z-elegance-review.md`.

## Progress Log
- 2026-04-18: bounded same-issue child lane created the CO-239 docs-first packet against source anchor `ctx:sha256:0d82ad4fdf8297fae69d0937a0588fb2976cb0c927eb468ec132a5ff9c789318#chunk:c000001`. The shared source payload is metadata-only, so the packet preserves the live issue checksum from the parent-owned issue cache: clean current `main` fails `docs:freshness` with `70` blocking Mar 18 stale rows, `221` visible CO-175 rolling rows, class split `Task Packet=50`, `Task Mirror=10`, `Report Only=10`, and lineage `1289-1298`.
- 2026-04-18: packet wording keeps the Apr 18 baseline-repair contract explicit and rejects blind `last_review` bumps, policy-cap changes, or reopening `CO-175`.
- 2026-04-18: parent refreshed exactly the `70` reviewed Mar 18 cohort rows, added the seven CO-239 packet/classification registry entries, refreshed the edited active-doc registry rows for `docs/TASKS.md` and `docs/guides/docs-freshness-cohorts.md`, and left the CO-175 rolling cohort untouched.
- 2026-04-18: after-state validation is truthful: `docs:freshness` passes with `0` blocking stale rows and `221` visible CO-175 rolling rows, and `docs:freshness:maintain` passes with `freshness_decision=pass_with_owned_rolling_debt`, `current_entries=221`, `current_cohorts=1`, and `blocking_changed_paths=[]`.
- 2026-04-18: after merging current `origin/main`, the prior unrelated full-suite blocker no longer reproduces; full `npm run test` passed with `345` files and `4212` tests.

## Relevant Files
- `docs/PRD-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- `docs/TECH_SPEC-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- `docs/ACTION_PLAN-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- `tasks/specs/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- `tasks/tasks-linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`
- `.agent/task/linear-a710d9a7-5187-414d-8a8b-beab7853e446.md`

## Notes
- Parent lane owns registry mirrors, cohort-guide updates, `out/` artifacts, docs-review, validation, workpad updates, and PR lifecycle.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`.
- Do not hide the `221` CO-175 rolling rows.
- Do not widen caps or windows.
- Do not solve the Apr 18 blocker with a blind `last_review` bump.
- Standalone review completed with `status=succeeded`, `review_outcome=bounded-success`, `startupAnchorObserved=true`, and `termination_boundary.kind=command-intent` / `provenance=validation-suite`; per provider policy this is successful bounded review completion, not a wrapper failure.
