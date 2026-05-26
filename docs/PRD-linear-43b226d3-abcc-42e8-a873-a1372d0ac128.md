# PRD - CO-569 preserve CO-558 May 20 retained docs freshness cohort owner

## Traceability
- Linear issue: `CO-569` / `43b226d3-abcc-42e8-a873-a1372d0ac128`
- Task id: `linear-43b226d3-abcc-42e8-a873-a1372d0ac128`
- Registry id: `20260524-linear-43b226d3-abcc-42e8-a873-a1372d0ac128`
- Shared source anchor: `ctx:sha256:c8af3976f2797b2c26a63723a434192feb3b3b84545710ef72467d2da74a98c7#chunk:c000001`
- Shared source payload from shared CO root: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source payload from provider issue worktree root to shared CO root: `../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source payload from this document directory to shared CO root: `../../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source manifest from shared CO root: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Shared source manifest from provider issue worktree root to shared CO root: `../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Shared source manifest from this document directory to shared CO root: `../../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Child docs-packet manifest: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Canonical owner key: `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
- Cohort id: `co-558-may-20-apr-19-task-report-maintenance`
- Configured historical owner evidence: `CO-558 terminal`
- Source breakdown: `{"rolling_window":68}`

## Summary
- Problem Statement: `CO-569` needs a docs-first packet and registry mirrors for the Apr 19 retained `docs:freshness:maintain` rolling-debt cohort so the parent lane can preserve the exact May 20 retained cohort canonical owner key without broad global owner churn.
- Desired Outcome: packet and registry evidence keep the canonical owner key, marker, cohort id, configured historical owner evidence, source breakdown, and issue-description sample paths visible before any parent-owned implementation, validation, Linear update, PR lifecycle, catalog change, guide change, or handoff.

## User Request Translation
- Create or refresh only the docs-first packet and registry mirror files for Linear issue `CO-569`.
- Preserve the exact retained-cohort owner contract:
  - `docs:freshness:maintain`
  - `canonical owner key`
  - `terminal-owner replacement`
  - `completed-lane registry residue`
  - `rolling-debt cohort`
  - `co-430-terminal-owner-replacement`
  - `dry-run/no-token copyable body`
  - `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
  - `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
  - `co-558-may-20-apr-19-task-report-maintenance`
  - `CO-558 terminal`
  - `{"rolling_window":68}`
- Keep the child lane docs-only. Parent owns authoritative issue source, live owner truth, workpad, Linear state, implementation, validation, review, PR lifecycle, catalog, cohort guide, validation logic, and handoff.

## Intent Checksum
- Exact user wording / phrases to preserve: `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, `co-430-terminal-owner-replacement`, `dry-run/no-token copyable body`, `CO-558 terminal`.
- Protected terms / exact artifact and surface names: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`, `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`, `co-558-may-20-apr-19-task-report-maintenance`.
- Nearby wrong interpretations to reject: global `docs:freshness:maintain` owner re-home, blind `last_review` bumps, historical packet deletion, docs catalog edits, cohort guide edits, validation logic edits, gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, provider-intake repair, Linear/GitHub/PR lifecycle mutation, and unrelated implementation changes.

## Current Truth
- `docs/docs-catalog.json` declares `co-558-may-20-apr-19-task-report-maintenance` as a baseline cohort with Apr 19 retained task/report maintenance evidence.
- `docs/docs-catalog.json` maps exact canonical owner key `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance` to live owner issue `CO-569`.
- `docs/guides/docs-freshness-cohorts.md` records `CO-558` as terminal historical owner evidence and records `CO-569` as the current live same-project exact-key owner for the May 20 retained cohort.
- The shared source anchor carries the issue-source wording; this child lane creates only the scoped docs packet and mirrors for parent import.

## Sample Paths
- Sample paths from the issue description / retained cohort source include:
  - `.agent/task/1299-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
  - `.agent/task/1300-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
  - `.agent/task/1301-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`

## Parity / Alignment Matrix

| Surface | Current Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- |
| Owner identity | The May 20 retained cohort is keyed by `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance` and currently maps to `CO-569`. | Packet and registry surfaces keep the exact canonical owner key and marker visible. | Global `docs:freshness:maintain` owner re-home or broad owner metadata changes. |
| Historical evidence | `CO-558 terminal` is configured historical owner evidence for the May 20 / Apr 19 cohort lineage. | Historical evidence remains visible and is not reused as a live owner. | Deleting, hiding, or blindly refreshing CO-558 lineage. |
| Route vocabulary | `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, and `co-430-terminal-owner-replacement` are distinct maintenance shapes. | Packet preserves those route names without collapsing them into generic freshness language. | Route weakening, fuzzy matching, or duplicate owner creation. |
| Sample paths | The retained cohort covers frontend-test CLI task packet paths and mirrors. | Packet records representative sample paths so parent validation can compare against issue source. | Editing catalog cohort path lists or unrelated docs. |
| Gate posture | `docs:freshness`, `docs:freshness:maintain`, and `spec-guard` stay fail-closed. | Parent validates exact owner truth and strict gates after importing the packet. | Weakening freshness, maintain, or spec-guard behavior. |

## Acceptance Criteria
1. PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, and `tasks/index.json` carry the exact canonical owner key and marker.
2. `docs/docs-freshness-registry.json` covers the six CO-569 packet/mirror files.
3. Packet preserves `CO-558 terminal`, `co-558-may-20-apr-19-task-report-maintenance`, `{"rolling_window":68}`, and the issue-description sample paths.
4. Packet preserves `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `rolling-debt cohort`, `co-430-terminal-owner-replacement`, and `dry-run/no-token copyable body`.
5. Packet rejects blind `last_review` bumps, historical packet deletion, docs/spec freshness gate weakening, fuzzy title matching, terminal owner reuse, duplicate owner creation, Linear/GitHub/PR lifecycle mutation, docs catalog edits, cohort guide edits, validation logic edits, and unrelated provider-worker behavior.
6. Parent-owned validation and lifecycle work stays outside this child lane.

## Not Done If
- The exact canonical owner key or marker is missing.
- `CO-558 terminal`, `co-558-may-20-apr-19-task-report-maintenance`, `rolling-debt cohort`, `{"rolling_window":68}`, or the sample paths are omitted or described as disposable.
- Registry evidence for the CO-569 packet files is missing.
- The packet implies a blind `last_review` bump is enough.
- The packet allows fuzzy title matching, terminal owner reuse, historical packet deletion, docs/spec freshness gate weakening, or unrelated provider-worker behavior.
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
- Guardrail: all child validation remains scoped to JSON parse, protected-term scan, and diff/whitespace checks.
- Guardrail: changes remain uncommitted for parent patch export.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? No.
- This docs-only packet does not add or retain runtime fallback behavior. Parent-owned implementation must preserve fail-closed maintenance behavior and keep any fallback/refactor decisions in the parent lane.

## Open Questions
- Parent lane must verify live owner truth in the authoritative workspace before any owner mutation or lifecycle transition.

## Approvals
- Docs packet child lane: produced for parent import.
- Parent source inspection, validation, Linear state, PR lifecycle, and final review handoff remain parent-owned.

## 2026-05-26 Retained Cohort Resume
- CO-569 moved from Blocked to In Progress at 2026-05-26T04:04:59.655Z to resolve the May 20 retained docs freshness cohort.
- Scope remains exact: reclassify only co-558-may-20-apr-19-task-report-maintenance rows after evidence review; no CO-581 May 19 cleanup, no CO-579 global owner lifecycle, no spec pre-expiry work, no gate weakening, and no historical deletion.
- Live issue-context evidence verified CO-260 and CO-254 as Done/completed for the non-numbered cohort rows; task specs 1299-1302 are already done with no local open checklist obligations.
