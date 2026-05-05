---
id: 20260404-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc
title: CO STATUS: restore truthful default operator telemetry and Symphony parity
status: done
owner: Codex
created: 2026-04-04
last_review: 2026-05-05
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md
related_action_plan: docs/ACTION_PLAN-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md
related_tasks:
  - tasks/tasks-linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc.md
review_notes:
  - 2026-04-04: Opened from Linear issue `CO-78` in the provider-worker workspace using issue id `bea56fb8-c601-4554-8ece-0a63c5fd34bc`.
  - 2026-04-04: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`), showed no attached PR and no existing workpad, and the issue was transitioned from `Ready` to `In Progress` before active coding.
  - 2026-04-04: The workspace started detached at `4f4ecdcb88897c76a25d5acff85b25e58ffd4e8d` (contained by `main` and `linear/co-77-release-prep-hardening`) and moved onto branch `linear/co-78-status-truthful-telemetry-parity-r2` before tracked repo edits.
  - 2026-04-04: Pre-implementation audit identified the active CO rendering seam in `orchestrator/src/cli/control/controlStatusDashboard.ts` with focused regression coverage in `orchestrator/tests/ControlStatusDashboard.test.ts`, and the detailed Symphony reference in `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex` plus `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/orchestrator_status_test.exs`.
  - 2026-04-04: Issue-quality review approves one bounded lane over the full visible default CO STATUS contract: default launch behavior, header telemetry, rate-limit presentation, running-row semantics, degraded/idle states, and real-device screenshot proof. Narrow single-field fixes, dashboard redesign, and unrelated control-host refactors remain out of scope.
  - 2026-04-04: Audited `codex-orchestrator docs-review` child stream completed with `status: succeeded`, `review_outcome: clean-success`, and no blocking findings. Evidence: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`, `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/review/telemetry.json`.
  - 2026-05-05: CO-444 live docs-freshness audit confirmed CO-78 is Done/completed (updated_at=2026-04-14T05:06:42.419Z, #359 lineage); reclassified this April 4 task packet/spec mirror as completed-lane historical metadata under live `docs:freshness:maintain` owner CO-444 without weakening docs-freshness or deleting historical evidence.
---

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Completed-lane historical packet/spec freshness hold | `expire fallback` | CO-444 | Terminal Linear source issues left task-packet/spec metadata active past cadence | 2026-05-05 | 2026-05-05 | 2026-05-12 | Archive packet mirrors and reclassify specs under a live owner; otherwise block handoff | `docs:freshness:maintain -- --format json` |

- Large refactor decision: bounded metadata cleanup under the existing `docs:freshness:maintain` owner; no runtime or policy authority split is added.
- Minor seam decision: bounded temporary freshness-hold cleanup is acceptable; unresolved rows must be archived, reclassified, or blocked by 2026-05-12.

# Technical Specification

## Context

`CO-78` is a follow-up to the broader public-surface hardening work from `CO-77`, but its scope is narrower and stricter: restore truthfulness for the default non-JSON `co-status` operator surface. The entire visible frame must be treated as one product contract. The default path still auto-starts and advertises an HTTP dashboard that is not ready to be the default operator surface, key header and row telemetry remains empty or misleading during live usage, top-line rate-limit output is Linear-first instead of Codex-first, and visible semantics diverge from the more useful local Symphony reference.

The lane therefore needs one coherent pass over the full visible surface: default launch behavior, header telemetry, rate limits, running-row columns, degraded or unavailable semantics, and validation proof.

## Requirements

1. Default non-JSON `co-status` must stop auto-starting the HTTP dashboard and must not print a `Dashboard:` URL line unless the dashboard is explicitly enabled and actually present.
2. During a real active Codex run, header `Tokens` (`in/out/total`) and `Throughput` must show truthful advancing values when authoritative data exists.
3. `Rate Limits` must surface Codex usage limits when available; Linear budget must not be the only top-line limit signal.
4. Linear rate-limit presentation must be cleaned up so requests and complexity values are authoritative, raw source labels are not shown, and reset timing is rendered in a clear trustworthy human format or omitted if not trustworthy.
5. Running rows must align more closely with Symphony where that improves operator value:
   - distinct meaningful `EVENT` separate from `STAGE`
   - `PID` column
   - truthful `AGE / TURN`
   - truthful `TOKENS`
   - truthful `SESSION`
   - explicit `n/a` semantics when authoritative data is unavailable
6. Automated coverage must exercise the shared visible-truth path for launch/default behavior, telemetry aggregation, rate-limit rendering, row semantics, and degraded or empty states.
7. Manual validation must cover live, paused/inspect, compact/constrained-height, idle/empty, and retry/degraded states with real screenshots from this device embedded directly in Linear.

## Protected Expectations

- This lane owns the full visible default CO STATUS contract, not a narrow single-field fix.
- `co-status`, `Tokens`, `Throughput`, `Rate Limits`, `STAGE`, `EVENT`, `PID`, `AGE / TURN`, `TOKENS`, and `SESSION` are all user-visible product surface in this issue.
- The default non-JSON `co-status` path must stop auto-running and advertising the HTTP dashboard.
- Symphony remains the reference for operator-useful semantics, especially for event meaning, PID visibility, turn or session or token projection, and rate-limit presentation.
- Validation evidence must use real screenshots captured from this device and embedded directly in Linear.

## Reject These Wrong Interpretations

- Only fix the first empty field the reporter mentioned and treat the rest of the frame as out of scope.
- Keep starting the HTTP dashboard by default and merely hide the rendered `Dashboard:` line.
- Accept rendered proof cards, mock frames, or text-derived screenshots as closeout evidence.
- Assume untouched visible fields are correct without re-testing them after the truth-path edits.
- Treat `AGE / TURN` as a pure paint bug even when upstream turn, session, or token data is missing.

## Current Truth

- `controlStatusDashboard.ts` owns the visible terminal frame and currently renders `Throughput`, `Rate Limits`, optional `Dashboard:`, and running-row columns including `AGE / TURN`, `TOKENS`, `SESSION`, and `EVENT`.
- Existing CO tests explicitly show current gaps in the visible surface, including `Dashboard:` line rendering, a Linear-first rate-limit format that exposes internal source text, and column layouts without PID parity.
- Symphony’s status dashboard already provides the target semantics baseline for PID, event humanization, dashboard-URL conditionality, and row/header truthfulness.
- The current ticketed risk is not only rendering. Some visible empty or misleading fields likely reflect missing or dropped upstream telemetry through the CO read-model path.

## Proposed Design

### 1. Restore truthful default operator mode

- Identify the current default `co-status` launch path and remove implicit dashboard auto-start from the default non-JSON operator flow.
- Ensure `Dashboard:` is rendered only when a dashboard server is explicitly enabled and the bound URL is authoritative.
- Keep explicit dashboard-enabled behavior intact where the operator deliberately opts into it.

### 2. Make summary telemetry authoritative

- Trace the current token and throughput data path from the live status read model into the summary header.
- Carry authoritative live token totals and rolling throughput into the visible header during active usage.
- When the data is genuinely unavailable, render explicit `n/a` semantics rather than empty or misleading placeholders.

### 3. Clean up rate-limit presentation

- Prefer Codex usage limits as the primary top-line signal when available.
- Treat Linear budget as secondary and clearly labeled.
- Remove raw internal source text from the rendered line.
- Use a consistent human-readable reset formatter and suppress reset text when the underlying value cannot be trusted.

### 4. Reach Symphony parity for row usefulness

- Add `PID` to the running table.
- Use Symphony’s event-humanization approach as the reference for `EVENT`.
- Keep `STAGE` focused on lifecycle stage while `EVENT` conveys the most useful live event text.
- Project truthful `AGE / TURN`, `TOKENS`, and `SESSION` values through the row model when available; otherwise render explicit `n/a`.

### 5. Re-test the full visible contract

- Expand existing CO dashboard tests instead of inventing a parallel status contract.
- Add focused coverage for default launch behavior, Codex-first rate limits, cleaned Linear budget rendering, PID column semantics, event humanization, and `n/a` degradation behavior.
- Back the closeout with real-device screenshots for the required live and degraded states.

## Non-Goals

- No broad redesign of the HTTP dashboard UI or UX itself.
- No unrelated control-host refactor beyond the bounded seams needed to restore the default CO STATUS contract.
- No proof-card rendering, mock frames, or synthetic screenshot generation for validation.
- No narrow fix that leaves the rest of the visible default CO STATUS surface unverified.

## Parity / Alignment Matrix

| Surface | Current CO truth | Symphony reference | Target CO truth |
| --- | --- | --- | --- |
| Default `co-status` launch | auto-starts and advertises dashboard | dashboard URL only when enabled and present | terminal-only default unless explicitly requested |
| Top-line rate limits | Linear-first, raw source text can leak | operator-useful rate limits without internal tags | Codex-first, Linear cleaned and secondary |
| `EVENT` | can collapse to stage fallback | humanized meaningful event text | meaningful event distinct from stage |
| `PID` | absent | present in running table | present in running table |
| `AGE / TURN`, `TOKENS`, `SESSION` | often effectively empty or misleading | projected or explicit unavailable semantics | authoritative values or explicit `n/a` |
| Validation | historically under-covered visible surface | snapshot-tested status surface | full visible-surface re-test plus real screenshots |

## Not Done If

- `co-status` still auto-starts or advertises the HTTP dashboard by default.
- `Tokens`, `Throughput`, `Rate Limits`, `EVENT`, `PID`, `AGE / TURN`, `TOKENS`, or `SESSION` remain empty, misleading, or unverified during real active usage.
- The Linear rate-limit line still leaks raw source text such as `dispatch_source_issue_by_id`.
- Reset timing remains as unclear raw-seconds output without trustworthy human intent.
- Symphony was not used as the detailed reference for the operator semantics in this lane.
- Closeout evidence relies on rendered proof cards instead of real screenshots embedded directly in Linear.

## Validation Plan

- Run audited `linear child-stream --pipeline docs-review` before implementation.
- Add focused regressions in `orchestrator/tests/ControlStatusDashboard.test.ts` and any adjacent shared-status tests required by the touched data path.
- Run the required repo validation floor after implementation.
- Capture real screenshots for live, paused/inspect, compact, idle, and degraded states and embed them directly in the Linear workpad.
- Run manifest-backed standalone review and an explicit elegance pass before review handoff.

## Approvals

- Reviewer: `codex-orchestrator docs-review` approved with `review_outcome: clean-success`
- Date: `2026-04-04`
- Manifest: `.runs/linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc-co-78-docs-review/cli/2026-04-03T23-02-25-401Z-e6287e4b/manifest.json`
