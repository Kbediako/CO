# ACTION_PLAN - CO-305 keep parent issue evidence truthful across cross-issue `issue-context` reads

## Summary
- Goal: eliminate the singleton overwrite seam where later cross-issue reads can make `provider-linear-issue-context-cache.json` untruthful parent issue evidence.
- Scope:
  - issue-keyed cache artifact resolution in `providerLinearWorkflowFacade.ts`
  - deterministic issue-specific selection for authoritative same-run cache consumers
  - focused regression coverage for the reproduced `CO-301` multi-issue read shape
  - run-artifact and docs-first packet traceability updates away from the ambiguous singleton path
- Assumptions:
  - the current singleton path is resolved from the provider Linear audit path and can be rewritten by later cross-issue reads
  - authoritative downstream consumers include both runtime fallback paths and docs/task packet evidence that currently treat the cache artifact as authoritative

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider-linear-issue-context-cache.json`
  - `issue-context`
  - `run-scoped artifact`
  - `cross-issue reads`
  - `parent issue evidence`
  - `CO-301`
  - `CO-295`
  - `CO-299`
  - `CO-302`
  - `docs-first packet`
- Not done if:
  - a later cross-issue read can still overwrite the same apparent parent-authoritative path
  - runtime or docs consumers still rely on one ambiguous singleton cache artifact for issue-specific truth
  - downstream docs/task packets can still cite a parent cache path that now contains a different issue body
- Pre-implementation issue-quality review:
  - the current seam is not generic Linear truth drift and not docs-only wording drift. The overwrite behavior lives in the existing cache resolution and read/write helpers, and authoritative downstream consumers need issue-specific selection to remain truthful.

## Milestones & Sequencing
1. Accept the docs-first packet and keep the issue contract narrow around cache persistence truth and authoritative downstream consumers.
2. Implement issue-keyed cache artifact resolution or an equivalent deterministic issue-specific selector in `providerLinearWorkflowFacade.ts`.
3. Update bounded same-run cache consumers so they request or resolve issue-specific cache truth instead of relying on one singleton path.
4. Add focused regressions for the `CO-301` multi-issue read shape and a negative check that later cross-issue reads do not overwrite parent issue evidence.
5. Update run-artifact and docs-first packet traceability guidance to point at issue-specific evidence, then run parent-owned review and validation.

## Dependencies
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`
- existing docs/task packet surfaces that cite `provider-linear-issue-context-cache.json` as parent issue evidence

## Validation
- Checks / tests:
  - child lane: protected-term grep over the six packet files
  - child lane: `git diff --check --` on the six packet files
  - parent lane: focused cache overwrite regression for the `CO-301` multi-issue read shape
  - parent lane: focused same-run consumer regression for issue-specific selection
  - parent lane: docs-review and implementation review after source edits
- Rollback plan:
  - revert the issue-keyed cache selector and traceability update together if focused regressions show that authoritative same-run consumers can no longer resolve the requested issue deterministically

## Risks & Mitigations
- Risk: a narrow runtime change fixes one consumer but leaves docs-first packet evidence on the ambiguous singleton path.
  - Mitigation: treat issue-specific traceability updates as part of the same acceptance contract.
- Risk: issue-keyed persistence drifts into a broad provider-worker issue-context rewrite.
  - Mitigation: keep edits confined to cache resolution, cache read/write helpers, and authoritative downstream consumer selection.
- Risk: regression coverage misses the real multi-issue overwrite shape.
  - Mitigation: make the `CO-301` multi-issue read sequence the required focused regression shape, not a generic cache smoke test.

## Approvals
- Reviewer: pending parent acceptance and docs-review
- Date: 2026-04-22
