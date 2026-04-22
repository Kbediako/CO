# Task Checklist - linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9

- Linear Issue: `CO-303` / `7ceb95a8-218d-4353-82eb-a06a7f8aece9`
- Source issue: `CO-295` / `994efebc-e1e4-4e00-8046-c60143813251`
- MCP Task ID: `linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9`
- Primary PRD: `docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- TECH_SPEC: `tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- Shared source 0 anchor: `ctx:sha256:856f6a3b5bc0f34cf9ee98b4f991a782420eb41733154f29ec229e5ec3ee2341#chunk:c000001`
- Shared source payload note: recorded `source-0/source.txt` is run provenance only; authoritative issue wording came from read-only `linear issue-context` output for `CO-303` and `CO-295`
- CO-295 evidence manifests:
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-docs-nitpicks/cli/2026-04-22T05-53-20-840Z-5177eb47/manifest.json`
  - `.runs/linear-994efebc-e1e4-4e00-8046-c60143813251-review-tests-validation/cli/2026-04-22T06-12-29-447Z-4d1c90c4/manifest.json`

## Docs-First
- [x] PRD drafted with the exact `CO-303` launcher/runtime/ledger failure contract and the cited `CO-295` evidence shapes. Evidence: `docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`.
- [x] TECH_SPEC drafted with protected terms, wrong interpretations to reject, parity matrix, non-goals, and parent-owned implementation seams. Evidence: `tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`, `docs/TECH_SPEC-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`.
- [x] ACTION_PLAN drafted for parent-owned launcher/runtime/ledger implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`.
- [x] Checklist mirrored to `.agent/task/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`. Evidence: `.agent/task/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`.
- [x] Parent-owned registry surfaces were intentionally left untouched in this child lane: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: lane scope plus final diff.

## Child-Lane Scope
- [x] Child lane stayed inside the six declared docs files. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state, workpad state, or PR state. Evidence: final diff and read-only issue-context usage only.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [ ] Child-lane launcher and ledger state converge to a terminal success/failure/invalidation state when an appserver child run starts, finishes, stalls, or is killed.
- [ ] Child lanes cannot push or commit directly to the parent PR branch as a valid completion path; parent acceptance must own integration.
- [ ] Bounded advisory/docs/tests prompts are enforced or fail closed with explicit evidence when the child session drifts into parent-owned Linear/GitHub/PR lifecycle work.
- [ ] Focused regression or harness coverage exists for the CO-295 `review-docs-nitpicks` stuck-launching/direct-push shape and the `review-tests-validation` appserver drift shape.
- [ ] Operator output identifies the manifest/session evidence and recommended recovery action without requiring manual process-table archaeology.

## Validation
- [x] Read-only issue-context captured for `CO-303` and `CO-295`. Evidence: `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-303 --format json` and `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id CO-295 --format json`.
- [x] Child scoped protected-term check across the six packet files. Evidence: `rg -n --no-heading 'linear child-lane|provider-linear-child-lane|review-docs-nitpicks|review-tests-validation|status=launching|provider_worker_child_lane_not_ready|appserver runtime|patch artifact|parent PR branch|parent-owned PR monitoring|bounded advisory lane|CO-295|PR #597' docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md docs/TECH_SPEC-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md tasks/tasks-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md .agent/task/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`.
- [x] Child scoped whitespace / diff check across the six packet files. Evidence: `for f in docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md docs/TECH_SPEC-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md tasks/tasks-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md .agent/task/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md; do git diff --no-index --check -- /dev/null "$f" >/tmp/co303-docs-check.log 2>&1; code=$?; if [ "$code" -gt 1 ]; then cat /tmp/co303-docs-check.log; exit "$code"; fi; done`.
- [ ] Parent focused launcher/runtime/ledger tests cover fail-closed runtime/scope-drift and stuck-launching recovery shapes.
- [ ] Parent docs-review before implementation.
- [ ] Parent required validation floor passes in the authoritative workspace.

## Progress Log
- 2026-04-22: bounded same-issue docs child lane created the six-file `CO-303` docs-first packet only. The recorded `source-0` payload is provenance metadata, so the packet is anchored on read-only `CO-303` and `CO-295` issue-context output plus the exact cited `CO-295` evidence manifests for `review-docs-nitpicks` and `review-tests-validation`.
- 2026-04-22: packet preserved the exact protected terms, wrong-interpretation rejections, non-goals, parity matrix, and acceptance criteria from `CO-303` while keeping registry mirrors, implementation, tests, Linear state, workpad, PR lifecycle, and patch integration parent-owned.
