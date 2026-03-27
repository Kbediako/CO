# ACTION_PLAN - CO Add Audited Provider-Worker Child-Stream Support for Bounded Multi-Agent Work
## Summary
- Goal: Added bounded, audited provider-worker child-stream support without weakening delegation guard or workspace confinement. Scope: Provider-worker launcher, proof lineage, nested-run filtering, and validation/docs updates for CO-13 only. Assumptions: The parent provider worker remains the only owner of issue state transitions, and child streams stay read-only or review-oriented.
## Milestones & Sequencing
- Audited the Symphony plus CO provider-worker baseline, added the child-stream launcher plus lineage safeguards, and ran the validation/review follow-up loop for the attached PR.
## Dependencies
- Local Symphony references at `/Users/kbediako/Code/symphony` and the current CO provider-worker/control-host contract surfaces.
## Validation
- Checks / tests: Required validation floor plus focused provider-worker child-stream/workflow tests. Rollback plan: revert the child-stream lane, lineage persistence, and prompt/docs updates together if review finds regressions.
## Risks & Mitigations
- Risk: child streams escape the parent task/workspace or record misleading lineage. Mitigation: manifest-backed provenance checks, allowlisted pipelines, child-task stamping, nested-run filtering, and run-root path validation.
## Approvals
- Reviewer: Self-reviewed against the active spec/workflow requirements during the PR loop. Date: 2026-03-27
