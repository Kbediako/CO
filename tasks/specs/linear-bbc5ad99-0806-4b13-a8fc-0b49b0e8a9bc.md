---
id: 20260405-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc
title: CO STATUS: restore live root control-host Codex session, token, throughput, and 5-hour/weekly rate-limit telemetry after CO-83
status: done
owner: Codex
created: 2026-04-05
last_review: 2026-05-06
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md
related_action_plan: docs/ACTION_PLAN-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md
related_tasks:
  - tasks/tasks-linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc.md
review_notes:
  - 2026-05-06: CO-503 live Linear audit confirmed CO-98 is `Done` (state_type=completed, updated_at=2026-04-15T22:50:29.293Z) with merged PR #367 attached; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-04-05` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-04-05: Opened from Linear issue `CO-98` in the provider-worker workspace using issue id `bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`.
  - 2026-04-05: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`), showed no attached PR and no existing workpad, and the issue was transitioned from `Ready` to `In Progress` before active coding.
  - 2026-04-05: The workspace started detached at `8c6a76339` (equal to `origin/main`) and moved onto branch `linear/co-98-root-status-telemetry` before tracked repo edits.
  - 2026-04-05: Pre-implementation audit confirmed the remaining lane is the live root control-host truth path for `Tokens`, `TOKENS`, `SESSION`, `Throughput`, and Codex `5-hour` / `weekly`, with the active seams in `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/controlStatusDashboard.ts`, and `orchestrator/src/cli/control/selectedRunProjection.ts`.
  - 2026-04-05: Current truth is not a layout-only issue: `controlStatusDashboard.ts` already contains the protected labels/columns and rate-limit labels, while `controlRuntime.ts` and the provider-worker proof path still determine whether authoritative root-host telemetry reaches those surfaces during active runs.
  - 2026-04-05: Issue-quality review approves one bounded root telemetry lane over runtime parse, proof persistence, root aggregation/projection, terminal rendering, and direct root-host proof. Browser redesign, workspace-only proof validation, and synthetic telemetry remain out of scope.
  - 2026-04-05: Audited `docs-review` succeeded in `.runs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc-co-98-docs-review/cli/2026-04-05T13-36-14-575Z-1c06d24e/manifest.json` and review telemetry reported `status=succeeded`, `review_outcome=clean-success`.
  - 2026-04-05: Implementation restored root-host session/token/throughput/Codex rate-limit truth via authoritative appserver session-log hydration, in-progress selected-run proof refresh, dashboard `window_minutes` rendering, and a follow-up exact-issue-identifier matcher fix after PR review flagged the `CO-2` / `CO-20` collision case.
---

# Technical Specification

## Context

`CO-98` is the follow-up to `CO-83` for the live root local control-host. The terminal already has the protected `CO STATUS` labels and columns, and `providerLinearWorkerRunner.ts` already persists proof telemetry, but a real active provider-worker run still does not drive truthful token/session/throughput/rate-limit data into the root host read-model all the way through to the final terminal surface.

The remaining problem spans the same truth path, but at the root-host acceptance surface:

1. authoritative runtime telemetry may still be normalized incompletely or overwritten before it lands in `provider-linear-worker-proof.json`,
2. the root control-runtime compatibility/projection path may still fail to prefer or aggregate the authoritative proof telemetry for active rows and totals, and
3. the terminal renderer may still omit or mis-format the final root-host segments even when the authoritative payload exists.

This lane therefore needs one coherent pass across runtime parse, proof persistence, root aggregation/projection, and terminal presentation, validated against the root live host rather than a workspace-only proof path.

## Requirements

1. During a real active provider-worker run on the root local control-host, header `Tokens` must render truthful non-empty values when runtime telemetry exists.
2. Running rows must render truthful `TOKENS` and `SESSION` values when runtime telemetry exists.
3. `Throughput` must advance from real token samples when runtime telemetry exists.
4. `Rate Limits` must include authoritative Codex `5-hour` and `weekly` segments when runtime telemetry exists.
5. The fix must repair the live root control-host path end to end, not just a workspace proof fixture or screenshot artifact.
6. Automated coverage must protect the live root truth path from runtime event parsing through proof, aggregation/projection, and terminal rendering.
7. Final validation must include real screenshots from this device taken against the root local control-host and embedded directly in the Linear workpad.

## Proposed Design

### 1. Trace the root authoritative telemetry path

- Verify the current runtime event -> proof -> compatibility projection -> dashboard flow for the protected token/session/throughput/rate-limit fields.
- Confirm whether the remaining loss occurs in proof normalization, root aggregation/preference, or terminal formatting.
- Keep the diagnosis tied to the root local control-host acceptance surface.

### 2. Repair the smallest remaining proof or aggregation seam

- If the proof path is incomplete, extend normalization additively so authoritative token/session/rate-limit data survives live updates.
- If the proof is already correct, adjust root aggregation or compatibility projection so the root-host dataset surfaces the authoritative values instead of stale or empty fallbacks.
- Preserve explicit unavailable semantics when telemetry is genuinely absent.

### 3. Keep terminal changes additive and truthful

- Only change `controlStatusDashboard.ts` where the root dataset already has truthful data but the final surface still hides or mislabels it.
- Preserve existing generic rate-limit support while ensuring Codex `5-hour` and `weekly` segments render when present.
- Do not invent values for `Tokens`, `TOKENS`, `SESSION`, or `Throughput`.

### 4. Re-test the live root path

- Add focused regressions around the repaired seam.
- Cover both payload preservation and final presentation for the protected fields.
- Validate the final behavior against a real root local control-host screenshot, not a workspace-only proof frame.

## Non-Goals

- No browser `/ui` dashboard redesign.
- No attach-viewer scrollback redesign.
- No synthetic token/session/rate-limit values.
- No broad parity work outside the root telemetry path required by `CO-98`.

## Parity / Alignment Matrix

| Surface | Current CO truth | Reference truth | Target CO truth |
| --- | --- | --- | --- |
| Root header `Tokens` | can stay `n/a` during active runs | authoritative runtime telemetry should surface on the root host | truthful live `in/out/total` when telemetry exists |
| Running `TOKENS` / `SESSION` | can stay empty on the root host | active provider rows should expose live proof telemetry | truthful row values when telemetry exists |
| Root `Throughput` | can stay empty despite token activity | throughput should derive from accepted token samples | truthful advancing root-host throughput |
| Root `Rate Limits` | Linear rate limits can appear without Codex `5-hour` / `weekly` | authoritative Codex windows should surface when emitted | additive rendering of `5-hour` / `weekly` without regressing generic buckets |

## Not Done If

- The root live host still shows `Tokens: in n/a | out n/a | total n/a` during a real active run that emits telemetry.
- Running rows still show `TOKENS n/a` or `SESSION n/a` during a real active run that emits telemetry.
- Only Linear rate limits render while Codex `5-hour` / `weekly` stay absent.
- Validation relies on workspace proof frames rather than the root local control-host.

## Validation Plan

- Run audited `linear child-stream --pipeline docs-review` before implementation.
- Add focused regressions in the affected provider-worker, control-runtime, and dashboard tests.
- Run the required validation floor after implementation.
- Capture real-device screenshots showing corrected root local control-host `CO STATUS` output and embed them directly in the Linear workpad.
- Run manifest-backed standalone review and explicit elegance review before review handoff.

## Approvals

- Reviewer: `codex-orchestrator docs-review`
- Date: `2026-04-05`
- Manifest: `.runs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc-co-98-docs-review/cli/2026-04-05T13-36-14-575Z-1c06d24e/manifest.json`
- Review telemetry: `.runs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc-co-98-docs-review/cli/2026-04-05T13-36-14-575Z-1c06d24e/review/telemetry.json`
