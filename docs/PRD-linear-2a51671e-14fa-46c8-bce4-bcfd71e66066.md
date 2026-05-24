# PRD - CO-581 preserve CO-558 May 19 retained docs freshness cohort owner

## Traceability
- Linear issue: `CO-581` / `2a51671e-14fa-46c8-bce4-bcfd71e66066`
- Task id: `linear-2a51671e-14fa-46c8-bce4-bcfd71e66066`
- Registry id: `20260524-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066`
- Shared source anchor: `ctx:sha256:8824b9aeafca297dd598861836955314d72ed9c6909cafd917eb485e571fa786#chunk:c000001`
- Parent source payload from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/memory/source-0/source.txt`
- Parent source manifest from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Child docs-packet manifest: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Canonical owner key: `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Cohort id: `co-558-may-19-apr-18-task-report-maintenance`
- Terminal historical owner evidence: `CO-568 terminal`
- Configured owner evidence: `CO-579`
- Source breakdown: `{"rolling_window":71}`

## Summary
- Problem Statement: `CO-581` needs a docs-first packet and registry mirrors for the May 19 retained `docs:freshness:maintain` rolling-debt cohort keyed by `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`.
- Desired Outcome: packet and registry evidence keep the canonical owner key, marker, cohort id, configured historical owner evidence, source anchor, and non-goals visible before any parent-owned owner verification, implementation, validation, Linear update, PR lifecycle, or handoff.

## User Request Translation
- Create only the docs-first packet and registry mirror files for Linear issue `CO-581`.
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
- Keep the child lane file-only. Parent owns authoritative issue source, live owner truth, workpad, Linear state, implementation, validation, review, PR lifecycle, and handoff.

## Intent Checksum
- Exact user wording / phrases to preserve: `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, `co-430-terminal-owner-replacement`, `dry-run/no-token copyable body`, `CO-568 terminal`.
- Protected terms / exact artifact and surface names: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`, `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`, `co-558-may-19-apr-18-task-report-maintenance`.
- Nearby wrong interpretations to reject: global `docs:freshness:maintain` owner re-home by this child lane, blind `last_review` bumps, historical packet deletion, gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, provider-intake repair, and unrelated implementation changes.

## Current Truth
- The shared source payload available to this child lane is a metadata source object for `CO-581`; it verifies the issue id, identifier, run id, manifest path, and source anchor but does not embed a larger issue body.
- The parent prompt supplies the protected owner key and docs-only scope. This packet preserves that contract rather than inferring unprovided Linear state.
- Current repo docs already record `CO-558` as the retained cohort lineage and `CO-568` as the exact-key owner that has since reached terminal `Done`; `CO-568` must become historical terminal-owner evidence rather than a live owner.
- This child lane must not edit `docs/docs-catalog.json`, cohort guide prose, implementation, validation scripts, Linear state, or PR state. Parent owns any live owner transition or catalog update after importing the patch.

## Sample Paths
- Sample paths preserved from the retained-cohort packet family include:
  - `.agent/task/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction.md`
  - `.agent/task/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md`
  - `.agent/task/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md`

## Parity / Alignment Matrix

| Surface | Current / Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- |
| Owner identity | The May 19 retained cohort is keyed by `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`. | CO-581 packet and registry surfaces keep the exact canonical owner key and marker visible for parent import. | Live owner transition, global owner re-home, or broad owner metadata changes. |
| Historical evidence | `CO-568 terminal` is terminal historical owner evidence for the May 19 exact-key owner, with `CO-558` retained as cohort lineage. | Historical evidence remains visible and is not reused as a live owner. | Deleting, hiding, or blindly refreshing CO-558/CO-568 lineage. |
| Existing exact-key owner evidence | Repo snapshot still records `CO-568` as the exact-key owner in catalog/guide surfaces. | Parent re-homes the exact-key owner to `CO-581` while preserving `CO-568` as historical terminal evidence. | Broad global owner re-home or fuzzy duplicate matching. |
| Route vocabulary | `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, and `co-430-terminal-owner-replacement` are distinct maintenance shapes. | Packet preserves those route names without collapsing them into generic freshness language. | Route weakening, fuzzy matching, or duplicate owner creation. |
| Gate posture | `docs:freshness`, `docs:freshness:maintain`, and `spec-guard` stay fail-closed. | Parent validates exact owner truth and strict gates after importing the packet. | Weakening freshness, maintain, or spec-guard behavior. |

## Acceptance Criteria
1. PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, and `tasks/index.json` carry the exact canonical owner key and marker.
2. `docs/docs-freshness-registry.json` covers the six CO-581 packet/mirror files.
3. Packet preserves `CO-568 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, source anchor `ctx:sha256:8824b9aeafca297dd598861836955314d72ed9c6909cafd917eb485e571fa786#chunk:c000001`, and representative retained-cohort sample paths.
4. Packet preserves `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, `co-430-terminal-owner-replacement`, and `dry-run/no-token copyable body`.
5. Packet rejects blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, and unrelated provider-worker behavior.
6. Parent-owned validation and lifecycle work stays outside this child lane.

## Not Done If
- The exact canonical owner key or marker is missing.
- `CO-568 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, `rolling-debt cohort`, the source anchor, or sample paths are omitted or described as disposable.
- Registry evidence for the CO-581 packet files is missing.
- The packet implies a blind `last_review` bump is enough.
- The packet allows fuzzy title matching, terminal owner reuse, historical packet deletion, docs/spec freshness gate weakening, catalog mutation from this child lane, or unrelated provider-worker behavior.
- This child lane mutates Linear, GitHub, workpad, PR lifecycle, implementation, validation scripts, docs catalog, or cohort guide surfaces.

## Goals
- Produce a minimal docs-first packet for parent import.
- Preserve exact retained-cohort owner identity and historical evidence.
- Add task and freshness registry mirrors for the new packet.

## Non-Goals
- No live Linear mutation.
- No GitHub, PR, workpad, lifecycle, or review action.
- No implementation, test, validation script, package, docs catalog, or cohort guide changes.
- No full repo validation suites.
- No historical evidence deletion, hiding, archival, blind refresh, or reclassification.

## Metrics & Guardrails
- Primary success metric: all scoped packet files and registry rows exist and include the protected owner contract.
- Guardrail: all child validation remains scoped to JSON parse, protected-term scan, changed-file scope, and diff/whitespace checks.
- Guardrail: changes remain uncommitted for parent patch export.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? No.
- This docs-only packet does not add or retain runtime fallback behavior. Parent-owned implementation must preserve fail-closed maintenance behavior and keep any fallback/refactor decisions in the parent lane.

## Open Questions
- Parent lane must verify live owner truth in the authoritative workspace before any owner mutation, catalog update, or lifecycle transition.

## Approvals
- Docs packet child lane: produced for parent import.
- Parent source inspection, live owner verification, PR lifecycle, and final review handoff remain parent-owned.
