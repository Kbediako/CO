# PRD - Coordinator Symphony-Aligned Standalone Review Active Closeout Bundle Fast-Fail Boundary

## Summary

`1118` proved the old whole-file non-determinism premise was stale, but it also exposed the next real review-reliability defect: bounded review can still widen into post-anchor rereads of the active closeout bundle for the task it is reviewing, including the live `09-review.log`, and then burn its timeout budget without producing a verdict. The next truthful slice is to fail fast on that self-inspection pattern.

## Problem

- `npm run review` on the completed `1118` docs/evidence lane reached the bounded task surface, then performed post-anchor rereads of the active closeout bundle and timed out after `240s`.
- Telemetry already classified the drift as `review-closeout-bundle`, so the remaining gap is not detection; it is timely enforcement.
- Letting review spend its full timeout budget inside post-anchor rereads of the active closeout bundle weakens operator trust and obscures whether the bounded diff itself had any issue.

## Goals

- Terminate bounded review promptly when it starts treating the active closeout bundle as fresh review scope after initial bounded inspection.
- Keep telemetry and operator-facing logs explicit about `review-closeout-bundle` self-inspection.
- Preserve the provenance hint and legitimate audit-mode allowances for run manifests and runner logs.

## Non-Goals

- Reopening `tests/run-review.spec.ts` determinism work.
- Removing the active closeout provenance hint entirely.
- Native review replacement or a broad standalone-review redesign.
- Changing audit-mode allowed meta surfaces.
- Rewriting historical closeout artifacts.

## User Value

- Review failures become faster and more truthful: operators see the real boundary defect instead of a generic timeout.
- Docs/evidence correction lanes stop wasting review budget on their own `09-review.log` and sibling artifacts.
- CO moves closer to the hardened Symphony-like posture we want: bounded surfaces, explicit authority, and prompt failure when the agent leaves the intended seam.

## Acceptance Criteria

- A bounded diff review that performs post-anchor rereads of the active closeout bundle fails before consuming the full generic timeout budget.
- The failure reason and telemetry still identify `review-closeout-bundle`.
- The provenance hint for the active closeout root remains intact.
- Existing audit allowances for run manifests and runner logs remain intact.
- Task/docs mirrors reflect the new fast-fail boundary scope accurately.
