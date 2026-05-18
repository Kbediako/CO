# Task Checklist - linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec

- Linear Issue: `CO-214` / `50e8a891-2b2f-4a67-b4d0-a2706870ddec`
- MCP Task ID: `linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec`
- Primary PRD: `docs/PRD-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- TECH_SPEC: `tasks/specs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- Shared source 0 anchor: `ctx:sha256:b7ad1828659a1c10272a7b9a6baa0ec33f1474751d0357cb894bd66f92c391c0#chunk:c000001`
- Current origin manifest: `.runs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec-docs-packet/cli/2026-04-17T05-33-52-283Z-922f6714/manifest.json`

## Docs-First
- [x] PRD drafted for stale merged-closeout residue after `CO-211` / `PR #506` once merged PR truth and live Linear `Done` truth are authoritative. Evidence: `docs/PRD-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`.
- [x] TECH_SPEC drafted with the stale-residue contract, protected terms, rejected reinterpretations, and parent-owned implementation seams. Evidence: `tasks/specs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`, `docs/TECH_SPEC-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`. Evidence: `.agent/task/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md` review notes.
- [x] `docs/docs-freshness-registry.json` coverage added for all six packet/mirror files. Evidence: `docs/docs-freshness-registry.json`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [ ] Merged `CO-211` / `PR #506` truth plus live Linear `Done` truth invalidate or supersede stale local `issue_state=Merging`, `state=handoff_failed`, `provider_issue_merge_closeout_action_required`, `merge_closeout.status=action_required`, `pending_shared_root_reconciliation`, `shared_root_not_on_main`, and `linear_transition=null` residue when that residue is no longer current.
- [ ] `fresh discovery suppression` no longer depends on that stale merged/Done residue.
- [ ] `CO STATUS active/backoff projection` no longer reports the stale merged/Done issue as current work.
- [ ] Truly current `pending_shared_root_reconciliation` behavior remains visible for actually live `Merging` lanes.
- [ ] Genuine `provider_refresh_lifecycle_stuck` / `restart_required` signals remain truthful for actual unhealthy refresh lifecycles.
- [ ] The repair does not drift into `CO-212 Ready reclaim` or a spec-guard-only reinterpretation.

## Validation
- [x] Child scoped JSON parse check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "CO-211|PR #506|merged PR truth|live Linear Done truth|issue_state=Merging|state=handoff_failed|provider_issue_merge_closeout_action_required|merge_closeout.status=action_required|pending_shared_root_reconciliation|shared_root_not_on_main|linear_transition=null|provider_refresh_lifecycle_stuck|restart_required|CO STATUS active/backoff projection|fresh discovery suppression|CO-212 Ready reclaim|spec-guard-only" docs/PRD-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md docs/TECH_SPEC-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md docs/ACTION_PLAN-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md tasks/specs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md tasks/tasks-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md .agent/task/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md docs/TECH_SPEC-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md docs/ACTION_PLAN-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md tasks/specs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md tasks/tasks-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md .agent/task/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [ ] Parent focused provider handoff / refresh serialization regression for the stale merged-closeout residue shape.
- [ ] Parent focused `CO STATUS` active/backoff projection regression for the stale merged/Done shape.
- [ ] Parent proof that true current `pending_shared_root_reconciliation` remains intact for actually live `Merging` lanes.
- [ ] Parent `node scripts/spec-guard.mjs --dry-run` after packet acceptance.

## Progress Log
- 2026-04-17: Bounded same-issue child lane created the `CO-214` docs-first packet and registry mirrors against source anchor `ctx:sha256:b7ad1828659a1c10272a7b9a6baa0ec33f1474751d0357cb894bd66f92c391c0#chunk:c000001`. The packet preserves the issue checksum: `CO-211`, `PR #506`, merged PR truth, live Linear Done truth, `provider-intake-state.json`, `issue_state=Merging`, `state=handoff_failed`, `provider_issue_merge_closeout_action_required`, `merge_closeout.status=action_required`, `pending_shared_root_reconciliation`, `shared_root_not_on_main`, `linear_transition=null`, `provider_refresh_lifecycle_stuck`, `restart_required`, `CO STATUS active/backoff projection`, `fresh discovery suppression`, no `CO-212 Ready reclaim`, and no spec-guard-only reinterpretation.
