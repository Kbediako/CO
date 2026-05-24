# Task Checklist - linear-2a51671e-14fa-46c8-bce4-bcfd71e66066

- Linear Issue: `CO-581` / `2a51671e-14fa-46c8-bce4-bcfd71e66066`
- MCP Task ID: `linear-2a51671e-14fa-46c8-bce4-bcfd71e66066`
- Primary PRD: `docs/PRD-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- TECH_SPEC: `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
- Parent source anchor: `ctx:sha256:8824b9aeafca297dd598861836955314d72ed9c6909cafd917eb485e571fa786#chunk:c000001`
- Parent source payload from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/memory/source-0/source.txt`
- Parent source manifest from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Child docs-packet manifest: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Canonical owner key: `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Cohort id: `co-558-may-19-apr-18-task-report-maintenance`
- Terminal historical owner evidence: `CO-568 terminal`
- Configured owner evidence: `CO-579`
- Source breakdown: `{"rolling_window":71}`
- Sample paths:
  - `.agent/task/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction.md`
  - `.agent/task/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md`
  - `.agent/task/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md`

## Docs-First
- [x] PRD created for the CO-581 retained cohort owner packet. Evidence: `docs/PRD-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] TECH_SPEC created with protected terms, route language, and parent-owned boundaries. Evidence: `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`, `docs/TECH_SPEC-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] ACTION_PLAN created for packet-only child-lane output and parent-owned validation. Evidence: `docs/ACTION_PLAN-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] `tasks/index.json` registered with the exact canonical owner marker. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` registered the six packet/mirror rows. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` snapshot added. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`. Evidence: `.agent/task/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared file scope. Evidence: final diff.
- [x] Child lane did not edit implementation, tests, scripts, workflows, `docs/docs-catalog.json`, or `docs/guides/docs-freshness-cohorts.md`. Evidence: final diff.
- [x] Child lane did not call Linear, GitHub, or lifecycle helpers. Evidence: this checklist and final command history.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Acceptance Criteria
- [x] Exact `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance` appears in every packet artifact and `tasks/index.json`.
- [x] Exact marker `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance` appears in every packet artifact and `tasks/index.json`.
- [x] Packet preserves `CO-568 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, source anchor, and sample paths.
- [x] Packet preserves `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, `co-430-terminal-owner-replacement`, and `dry-run/no-token copyable body`.
- [x] Packet rejects blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, catalog mutation from this child lane, and unrelated provider-worker behavior.
- [x] Parent verifies source payload in the authoritative workspace after import.
- [x] Parent verifies live owner truth before any owner update, catalog update, or lifecycle transition.
- [x] Parent runs focused docs freshness validation after importing this packet.

## Validation
- [x] Child scoped JSON parse check. Evidence: `jq empty tasks/index.json` and `jq empty docs/docs-freshness-registry.json` exited 0.
- [x] Child scoped registration checks. Evidence: `tasks/index.json` contains `20260524-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066`; `docs/docs-freshness-registry.json` contains six active `CO-581` rows.
- [x] Child scoped protected-term check over the packet, mirrors, registry, task index, and docs task snapshot. Evidence: Node protected-term check found all required owner terms, source anchor, and sample paths.
- [x] Child scoped whitespace / diff check on touched files. Evidence: trailing-whitespace scan returned no matches, and `git diff --check -- docs/TASKS.md docs/docs-freshness-registry.json tasks/index.json` exited 0.
- [x] Child scoped minimality review confirms no implementation/catalog/guide drift. Evidence: changed-file scope check listed only declared files.
- [x] Parent live owner validation passed. Evidence: `npm run docs:freshness:maintain -- --format json` reports CO-581 usable/In Progress for exact key and owner_finalizer.status=`passed_exact_canonical_owner_precedence`.

## Progress Log
- 2026-05-24: Bounded same-issue child lane created the CO-581 docs-first packet and registry evidence. The packet preserves `docs:freshness:maintain`, exact canonical owner key/marker, `CO-568 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, sample paths, terminal-owner replacement, completed-lane registry residue, rolling-debt cohort, `co-430-terminal-owner-replacement`, and dry-run/no-token copyable body while rejecting blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, catalog mutation from this child lane, and unrelated provider-worker behavior.
- 2026-05-24: Child scoped validation passed for JSON parse, registry/task registration, protected terms, changed-file scope, trailing whitespace, and diff check.
- 2026-05-24: Parent re-homed exact-key catalog/guide owner metadata from terminal `CO-568` to live `CO-581`; maintenance evidence now reports `pass_with_owned_rolling_debt`, candidate owner_issue=`CO-581`, action mode=`update_existing`, and owner_finalizer.status=`passed_exact_canonical_owner_precedence`.
