# PRD - CO-374 archive Core Lane dispatch discovery break

## Traceability
- Linear issue: `CO-374` / `d9cbfbc7-d653-463e-bf2a-878f0feac52f`
- Linear URL: https://linear.app/asabeko/issue/CO-374/co-workflow-stop-archive-core-lane-dispatch-discovery-from-polling
- Task id: `linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f`
- Canonical spec: `tasks/specs/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`

## Summary
- Problem Statement: the archive automation `Dispatch Core Lane for archive PR` step finds the newly dispatched `core-lane.yml` run id, assigns `RUN_ID`, and then continues sleeping through the bounded discovery loop before starting `gh run watch`.
- Desired Outcome: once exactly one new Core Lane run id is discovered, archive automation immediately exits discovery and starts watching that run while keeping ambiguity, error, and status-mirroring behavior intact.

## User Request Translation
- User intent / needs: remove the fixed post-discovery delay from the archive Core Lane dispatch path without weakening the PR-visible `Core Lane` status contract added for archive PRs.
- Success criteria / acceptance:
  - discovery breaks immediately after exactly one new run id is found
  - multiple matching new run ids still fail as ambiguous
  - pending, success, failure, and error commit-status mirroring remains intact
  - focused validation proves the fixed 40-attempt / 10-minute delay is gone
- Constraints / non-goals:
  - no archive policy rewrite
  - no change to `core-lane.yml` dispatch inputs
  - no branch-protection or status-context name change
  - no auto-merge token or archive payload changes

## Intent Checksum
- Exact user wording / phrases to preserve: `Dispatch Core Lane for archive PR`, `CANDIDATE_RUN_ID`, `RUN_ID`, `gh run watch`, `Break out of the discovery loop immediately after exactly one new Core Lane run id is found`, `Preserve ambiguity failure behavior`.
- Protected terms / exact artifact and surface names:
  - `.github/workflows/archive-automation-base.yml`
  - `core-lane.yml`
  - `Core Lane`
  - `RUN_ID`
  - `CANDIDATE_RUN_ID`
  - `BASELINE_RUN_IDS`
  - `set_core_lane_status`
- Nearby wrong interpretations to reject:
  - reducing the loop bound without breaking on success
  - choosing the first id when multiple new matching ids appear
  - removing the not-found retry window before any run is visible
  - weakening pending/success/failure/error commit-status writes
  - replacing `gh run watch` with a new workflow monitor

## Parity / Alignment Matrix
- Current truth: run `24936519457` stayed in dispatch from `2026-04-25T17:30:01Z` to `2026-04-25T17:40:03Z` even though child Core Lane run `24936529275` completed successfully by `2026-04-25T17:34:52Z`.
- Reference truth: once `find_dispatched_run_id` emits exactly one post-baseline id, the script has the only unambiguous run it can watch.
- Target truth / intended delta: the discovery loop keeps retrying while no id is visible, fails on ambiguous or discovery-error states, and breaks immediately after assigning the single unambiguous id.
- Explicitly out-of-scope differences: broader archive automation design, auto-merge credential repair, branch protection settings, and archive payload selection.

## Not Done If
- The loop still sleeps through remaining attempts after `RUN_ID` is assigned.
- Multiple new matching `workflow_dispatch` runs can be silently selected.
- Pending/success/failure/error status mirroring is removed or renamed.
- Validation only greps for `break` without proving ordering before the next `sleep 15`.

## Goals
- Remove the avoidable fixed discovery delay after successful run-id discovery.
- Preserve the existing fail-closed ambiguity path.
- Preserve archive PR status visibility and watcher behavior.
- Add focused regression coverage tied to the workflow script ordering.

## Non-Goals
- No changes to `.github/workflows/core-lane.yml`.
- No changes to `tasks-archive-automation.yml` or `implementation-docs-archive-automation.yml`.
- No token, permission, auto-merge, archive content, or branch-protection changes.
- No new runtime dependencies.

## Validation
- Focused Vitest coverage for archive workflow dispatch discovery behavior.
- Existing archive workflow contract spec updated to assert the new break-before-sleep ordering.
- Repo guard/build/lint/test/docs/review gates before handoff, with any unavailable gate recorded explicitly.

## Approvals
- Product: Linear CO-374
- Engineering: parent provider worker
