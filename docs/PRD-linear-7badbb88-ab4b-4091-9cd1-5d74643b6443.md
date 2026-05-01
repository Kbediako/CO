# PRD - CO-474 Ready Accepted/No-Run Revalidation Recovery

## Traceability
- Linear: `CO-474` / `7badbb88-ab4b-4091-9cd1-5d74643b6443`
- Task id: `linear-7badbb88-ab4b-4091-9cd1-5d74643b6443`
- TECH_SPEC: `docs/TECH_SPEC-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md`
- Checklist: `tasks/tasks-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md`
- Child docs manifest: `.runs/linear-7badbb88-ab4b-4091-9cd1-5d74643b6443-docs-packet/cli/2026-05-01T20-33-30-098Z-88f678f6/manifest.json`

## Problem
A `Ready issue` can remain in provider intake as `accepted/no-run` with `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, no worker, and no actionable retry error. Explicit `control-host recover` can then hang until `request timeout 120000ms` instead of launching or failing deterministically.

## Success
- Reproduce the CO-470 shape from artifacts or a focused fixture.
- `control-host recover` / relaunch / nudge for this shape either starts `provider-linear-worker` with run manifest and launch provenance or returns deterministic actionable failure quickly.
- Null run/manifest/launch evidence no longer consumes active admission indefinitely.
- Regression coverage preserves the CO-472 released-pending-reopen transition into accepted/pending-revalidation.
- CO-470 can be admitted after the fix without parent-side manual `provider-intake-state.json` edits.

## Intent Checksum
Protected terms: `CO-470`, `CO-472`, `control-host recover`, `Ready issue`, `accepted/no-run`, `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, `request timeout 120000ms`, `ProviderIssueHandoff`, `provider-linear-worker`, `launch_token`, `retry_error`.

Reject interpretations that implement CO-470 fixture-env cleanup, rewrite CO-472, relax WIP/admission caps, hand-edit `provider-intake-state.json`, directly launch provider workers from the parent shell, or mask the issue by extending request timeouts.

## Parity Matrix
| Surface | Current | Target | Out of scope |
| --- | --- | --- | --- |
| CO-470 evidence | Ready accepted/no-run pending-revalidation is the observed failure. | Parent proves the shape with CO-470 artifacts or fixture. | CO-470 fixture-env cleanup. |
| Recovery | Explicit recover can hang until caller timeout. | Start with provenance or fail fast with actionable reason. | New command surfaces. |
| Admission | Null run/manifest/launch evidence can look active forever. | No-run claims revalidate, launch, retry/fail, or stop occupying active capacity. | Global cap policy changes. |
| CO-472 | Released-pending-reopen fix already exists. | Accepted-side fix preserves that transition. | Reworking CO-472. |

## Not Done If
- `control-host recover` still reaches `request timeout 120000ms` for this shape.
- A `provider_issue_rehydration_pending_revalidation` claim with null run/manifest/launch evidence still occupies active capacity indefinitely.
- The fix requires manual state surgery, direct `provider-linear-worker` starts, CO-470 fixture-env cleanup, or CO-472 rewrite.

## Fallback Decision
Remove the accepted/no-run recovery hang. Retain CO-470 as evidence and CO-472 as adjacent reference only. If recovery truth is split across multiple lifecycle owners, file a follow-up instead of adding another ad hoc branch.
