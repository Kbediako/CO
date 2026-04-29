# Task Checklist - linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9

- Linear Issue: `CO-408` / `8098459b-be08-4f9f-8e45-bd315fb4c9b9`
- Linear URL: https://linear.app/asabeko/issue/CO-408/co-add-durable-child-lane-decision-lineage-for-provider-worker
- MCP Task ID: `linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9`
- Source issue: `CO-403` / `c8e3a464-ec50-4fa4-aff5-d8a780626600`
- Primary PRD: `docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- TECH_SPEC: `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`

## Docs-First
- [x] CO-408 issue intent translated into packet scope. Evidence: `docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] CO-403 source issue context preserved as reference truth. Evidence: packet references `CO-403` / `c8e3a464-ec50-4fa4-aff5-d8a780626600` and the narrow timestamp-skew fail-closed behavior.
- [x] PRD drafted with Immediate Traceability, protected terms, wrong interpretations, non-goals, Not Done If, and parity/alignment matrix. Evidence: `docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] Canonical TECH_SPEC drafted with lineage contract, recovery algorithm contract, validation plan, and packet-only boundaries. Evidence: `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] TECH_SPEC mirror drafted. Evidence: `docs/TECH_SPEC-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] ACTION_PLAN drafted for packet creation and later parent implementation. Evidence: `docs/ACTION_PLAN-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] Registry mirrors updated for the CO-408 packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Lineage Contract
- [x] Protected terms preserved: `provider-worker retry recovery`, `same-issue child lane`, `parallelize_now`, `recover_child_lane:<stream>`, `recover_run:<run_id>`, `latest prior decision lineage`, `stale older child lane`, and `fail closed`. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and canonical spec.
- [x] Future implementation target requires durable parent turn and parallelization decision lineage. Evidence: PRD and canonical spec Target Data Shape.
- [x] Future retry recovery is lineage-first and timestamp fallback remains bounded. Evidence: canonical spec Recovery Algorithm Contract.
- [x] Stale older child-lane rejection and stream-only rejection are explicit acceptance conditions. Evidence: PRD Not Done If and canonical spec Functional Requirements.
- [x] Proof/status lineage visibility is required. Evidence: PRD and canonical spec validation plan.

## Packet Boundaries
- [x] Packet states CO-408 remains Backlog/Ready-gated until the packet lands. Evidence: PRD Traceability and Immediate Traceability, ACTION_PLAN Immediate Traceability.
- [x] Packet states this PR only creates traceability packet/mirrors. Evidence: PRD Traceability, TECH_SPEC Implementation Summary, ACTION_PLAN Summary.
- [x] Packet forbids provider-worker implementation edits in this lane. Evidence: PRD Non-Goals and Not Done If, canonical spec Not Done If.
- [x] Packet forbids Linear state transition, workpad mutation, WIP-slot claim, duplicate child-lane launch, and PR handoff mutation. Evidence: PRD Traceability and Non-Goals.

## Validation
- [x] JSON parse check for edited registries. Evidence: `node -e "JSON.parse(...)"` returned `json ok` for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] Protected-term scan covers packet files. Evidence: `rg -n "provider-worker retry recovery|same-issue child lane|parallelize_now|recover_child_lane:<stream>|recover_run:<run_id>|latest prior decision lineage|stale older child lane|fail closed|Immediate Traceability|Not Done If|Parity / Alignment Matrix" ...` found matches across the CO-408 packet files.
- [x] `git diff --check`. Evidence: passed with no output.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed with `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: passed with `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `MCP_RUNNER_TASK_ID=linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9 npm run docs:freshness` passed with `docs:freshness OK - 4952 docs, 4955 registry entries`.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed with `Diff budget: OK (scope=working-tree, files=7/25, lines=593/1200, +592/-1)`.
- [x] Scoped diff review confirms no edits outside declared packet/mirror scope. Evidence: `git diff --name-only` listed only `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and `tasks/index.json`; `git ls-files --others --exclude-standard` listed only the six CO-408 packet/checklist files.

## Progress Log
- 2026-04-30: created the dedicated packet worktree from latest `origin/main` on branch `kb/co-408-traceability-packet`; no Linear transition or provider-worker implementation performed.
- 2026-04-30: drafted the CO-408 packet and mirrors as packet-only prep for later backlog hold cleanup.

## Notes
- Do not transition Linear state from this packet lane.
- Do not claim the provider-worker WIP slot.
- Do not implement `orchestrator/src/cli/providerLinearWorkerRunner.ts` or child-lane runner changes in this packet PR.
- Preserve CO-403 fail-closed recovery enforcement until a future CO-408 implementation adds durable lineage and focused tests.
