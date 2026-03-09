# PRD - Coordinator Symphony-Aligned Standalone Review Audit Supporting-Evidence Parity

## Summary

`1094` tightened default `diff` review so adjacent review-system surfaces are off-task unless the current diff explicitly touches them. The remaining bounded reliability gap is `audit`: it intentionally inspects evidence, but the runtime allowlist still permits only `run-manifest`, so live audit passes can still trip the meta-surface guard when they inspect the runner transcript. This slice brings audit-mode evidence parity by allowing the intended runner-log transcript surface without weakening the broader guard.

## Problem

- Audit-mode review is explicitly meant to inspect evidence and task/run artifacts, but the current runtime only allowlists `run-manifest`.
- The classifier already recognizes `run-runner-log`, yet audit-mode still treats repeated runner transcript inspection as off-task meta-surface expansion.
- That leaves the wrapper in an awkward middle state: `diff` is tighter after `1094`, but `audit` still lacks one of its intended supporting-evidence surfaces.

## Goals

- Keep the meta-surface guard active in audit mode for unrelated drift.
- Allow audit mode to inspect the runner transcript (`run-runner-log`) alongside `run-manifest`.
- Add focused regression coverage proving audit can inspect the intended evidence surface without reopening wrapper self-inspection churn.
- Keep the change narrowly bounded so the next Symphony controller seam can resume immediately afterward.

## Non-Goals

- Replacing the wrapper with a native review controller in this slice.
- Reopening the `1093` `diff` vs `audit` surface split.
- Broadening audit mode to arbitrary `.runs` content beyond the explicit evidence surfaces.
- Returning to the authenticated-route `controlServer.ts` seam in the same slice.

## User-Facing Outcome

- `npm run review -- --surface audit` can inspect both the manifest and runner transcript as intended evidence.
- Audit mode still fails closed on unrelated memories, skills, review artifacts, or wrapper support churn.
- The standalone-review baseline becomes reliable enough to resume the remaining Symphony alignment work without mixing it with wrapper drift.
