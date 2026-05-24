---
id: 20260524-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066
title: "CO-581 preserve CO-558 May 19 retained docs freshness cohort owner"
relates_to: docs/PRD-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md
last_review: 2026-05-24
owners:
  - Codex
canonical_owner_marker: codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance
---

# TECH_SPEC - CO-581 preserve CO-558 May 19 retained docs freshness cohort owner

This mirror points to the canonical task spec at `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`.

## Scope
- Create the CO-581 docs-first packet and registry mirror files.
- Register `linear-2a51671e-14fa-46c8-bce4-bcfd71e66066` in `tasks/index.json`.
- Add `docs/docs-freshness-registry.json` coverage for the six packet and mirror files.
- Preserve the exact retained-cohort owner contract:
  - `docs:freshness:maintain`
  - `canonical owner key`
  - `terminal-owner replacement`
  - `completed-lane registry residue`
  - `rolling-debt cohort`
  - `co-430-terminal-owner-replacement`
  - `dry-run/no-token copyable body`
  - `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
  - `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
  - `co-558-may-19-apr-18-task-report-maintenance`
  - `CO-568 terminal`
  - `{"rolling_window":71}`

## Sample Paths
- `.agent/task/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction.md`
- `.agent/task/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md`
- `.agent/task/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md`

## Non-Goals
- No live Linear mutation.
- No GitHub, PR, workpad, or lifecycle action.
- No implementation, validation-script, docs catalog, cohort guide, package, or test changes.
- No blind `last_review` bump, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, or unrelated provider-worker behavior.

## Validation Contract
- `tasks/index.json` remains valid JSON and contains the CO-581 registration.
- `docs/docs-freshness-registry.json` remains valid JSON and contains six active rows for the CO-581 packet/mirror files.
- Protected-term scan finds the exact canonical owner key, marker, cohort id, configured historical owner evidence, route terms, source anchor, and sample paths across the scoped packet and registry surfaces.
- `git diff --check` passes for the declared file scope.

## Parent-Owned Handoff
- Parent must inspect source payload and live owner truth before any owner mutation, catalog update, or lifecycle transition.
- Parent owns `docs:freshness:maintain -- --format json`, broader docs freshness validation, issue workpad, PR lifecycle, and final Linear state.
