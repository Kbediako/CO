# Task Checklist - linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a

- Linear Issue: `CO-300` / `47c4ff7d-ff57-44b6-9bcd-d09640be140a`
- MCP Task ID: `linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a`
- Primary PRD: `docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- TECH_SPEC: `tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- Shared source 0 anchor: `ctx:sha256:e6e7135ed5c5dcc34ca04950403e7a9a88a5902d59c65a6241a8aba0924f7392#chunk:c000001`
- Shared source payload path: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/cli/2026-04-22T02-48-35-760Z-e043d741/memory/source-0/source.txt`
- Current worker manifest: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/cli/2026-04-22T02-48-35-760Z-e043d741/manifest.json`

## Docs-First
- [x] PRD drafted for the Apr 22 docs freshness owner lane with exact blocker shape, canonical owner transition, and protected terms preserved. Evidence: `docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, explicit ownership split, and parent-owned implementation seams. Evidence: `tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`, `docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`.
- [x] ACTION_PLAN drafted for parent implementation and validation only. Evidence: `docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`.
- [x] Checklist mirrored to `.agent/task/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`. Evidence: `.agent/task/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`.
- [x] Parent registered the CO-300 packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` on the current branch. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Parent docs-review evidence captured before implementation. Evidence: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a-co300-docs-review-r2/cli/2026-04-22T03-29-19-182Z-a978d6e2/manifest.json` (`docs:check` green; remaining failure was the expected pre-fix repo-baseline blocker).

## Source / Assumptions
- [x] Shared source anchor recorded. Evidence: `ctx:sha256:e6e7135ed5c5dcc34ca04950403e7a9a88a5902d59c65a6241a8aba0924f7392#chunk:c000001`.
- [x] The packet is refreshed against the parent worker prompt and current-main before artifacts, not the invalidated child-lane seed. Evidence: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/cli/2026-04-22T02-48-35-760Z-e043d741/memory/source-0/source.txt`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness.json`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness-maintenance.json`.
- [x] The older `4307`/`4316`/`53`/`6 missing` issue snapshot is preserved as historical context only; current `origin/main` truth is `4390` docs, `4393` registry entries, `16` stale docs, `0` missing-on-disk or invalid rows, and `15` candidate entries across `6` candidate cohorts. Evidence: before artifacts plus this checklist.
- [x] Parent-owned implementation boundaries remain explicit. Evidence: this checklist and `tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`.

## Packet Scope
- [x] The parent packet stays inside the declared docs/task surfaces for CO-300 registration. Evidence: current diff.
- [x] Implementation, test, findings, and workpad changes remain tracked separately from packet registration. Evidence: file ownership in `tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`.
- [x] Packet registration preserves the canonical owner transition without widening `CO-295`. Evidence: packet docs and `tasks/index.json`.

## Parent Implementation
- [x] Reproduce the Apr 22 baseline and save before artifacts under `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/`. Evidence: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness.json`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness-maintenance.json`.
- [x] Preserve the earlier six missing-on-disk registry references as non-repro current-main evidence and resolve hard-stale `docs/codex-orchestrator-issues.md` with reviewed evidence. Evidence: `docs/findings/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a-docs-freshness-classification.md`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/after/docs-freshness.json`.
- [x] Classify and process the Mar 21/22 historical stale cohorts, including `1317` / `1318`. Evidence: `docs/findings/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a-docs-freshness-classification.md`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/after/docs-freshness.json`.
- [x] Re-home canonical owner metadata from terminal `CO-175` / `CO-267` to live `CO-300` across remaining policy, catalog, and maintenance surfaces. Evidence: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, `tasks/index.json`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/after/docs-freshness-maintenance.json`.
- [x] Add or update focused regression coverage so terminal owner issues cannot remain the live maintenance recommendation. Evidence: `tests/docs-freshness-maintain.spec.ts`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/05c-test-r3.log`.
- [x] Unblock `CO-295` without widening its scope once the repo-wide owner lane is complete. Evidence: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/docs-freshness-maintenance-r3.json` (`clean`, `blocking_changed_paths=[]`, `owner_issue=CO-300`).

## Validation
- [x] Packet protected-term check over the docs and mirrors. Evidence: `rg -n "docs:freshness|docs:freshness:maintain|canonical owner|CO-175|CO-267|terminal owner metadata|blocking_changed_paths=\\[\\]|docs/codex-orchestrator-issues.md|missing-on-disk registry references|Mar 21/22 historical cohorts|1317|1318|current main" docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/tasks-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md .agent/task/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/TASKS.md`.
- [x] Packet whitespace and diff check over the touched files. Evidence: `git diff --check -- docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/tasks-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md .agent/task/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [x] Packet JSON parse checks passed for the touched mirrors. Evidence: `python3 - <<'PY'` parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] Parent `npm run docs:freshness` before/after recorded. Evidence: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness.json`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/docs-freshness-r3.json`.
- [x] Parent `npm run docs:freshness:maintain` before/after recorded. Evidence: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness-maintenance.json`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/docs-freshness-maintenance-r3.json`.
- [x] Parent focused regression coverage for terminal owner recommendation misuse recorded. Evidence: `tests/docs-freshness-maintain.spec.ts`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/05c-test-r3.log`.
- [x] Parent `npm run docs:check` and review loop recorded. Evidence: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/06c-docs-check-r3.log`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/11-review-fallback.md`, `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/validation/12-elegance-review.md`.

## Progress Log
- 2026-04-22: fresh current-main reproduction on branch `linear/co-300-docs-freshness-owner` at `f6d89efc3` recorded `docs:freshness FAILED - 4390 docs, 4393 registry entries`, `16` stale docs total, `0` missing-on-disk or invalid registry rows, one hard-stale `docs/codex-orchestrator-issues.md`, and `15` candidate entries across `6` candidate cohorts.
- 2026-04-22: the pre-fix maintenance path still proved the debt is repo-wide with `blocking_changed_paths=[]` for blocked `CO-295`, and focused owner verification confirmed terminal `CO-175` must force `owner_issue_action.mode=create_required` instead of `update_existing`.
- 2026-04-22: an initial docs child-lane seed packet succeeded but was invalidated after the parent moved from detached `HEAD` to current `origin/main`; the parent recreated the packet on the active branch so docs state matches the refreshed baseline instead of the older issue snapshot.
- 2026-04-22: packet registration now points the canonical owner marker at live `CO-300` while preserving `CO-267` as the previous canonical owner and `CO-175` as the original rolling owner in the narrative.
- 2026-04-22: parent-owned implementation completed the owner reset and reviewed refresh: `docs:freshness` and `docs:freshness:maintain` now return clean with live owner `CO-300`, and blocked `CO-295` no longer inherits repo-wide `blocking_changed_paths=[]` debt from terminal owner metadata.

## Relevant Files
- `docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- `docs/TECH_SPEC-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- `docs/ACTION_PLAN-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- `tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- `tasks/tasks-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- `.agent/task/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Notes
- Parent lane owns implementation, findings, tests, workpad updates, validation, Linear state, and PR lifecycle.
- Do not widen `CO-295`.
- Do not keep using terminal owner metadata as the live canonical owner.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`.
- Do not clear Apr 22 debt with blind `last_review` bumps or deletion-only cleanup.
