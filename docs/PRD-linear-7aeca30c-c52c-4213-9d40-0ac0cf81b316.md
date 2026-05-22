# PRD - CO-570 docs-review change bundle explicit scope

## Immediate Traceability
- Linear issue: `CO-570` / `7aeca30c-c52c-4213-9d40-0ac0cf81b316`
- Task id: `linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316`
- Canonical task spec: `tasks/specs/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- Task checklist: `tasks/tasks-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- `.agent` mirror: `.agent/task/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- Source anchor: `ctx:sha256:d9c322b93b1673e1fcb654e148e78489e74df51b03ab890768e710d3ad9e5bcc#chunk:c000001`
- Source object id: `sha256:d9c322b93b1673e1fcb654e148e78489e74df51b03ab890768e710d3ad9e5bcc`
- Parent manifest pointer: `.runs/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316-docs-packet-r2/cli/2026-05-21T22-29-44-832Z-e1af18db/manifest.json`
- Source payload pointer: `.runs/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316-docs-packet-r2/cli/2026-05-21T22-29-44-832Z-e1af18db/memory/source-0/source.txt`

## Summary
- Problem Statement: review packet handoff can become ambiguous when `docs-review` consumes `change-bundle.json` without a durable explicit review scope that says whether the bounded review is looking at an uncommitted working tree, a committed branch diff, or a base diff.
- Desired Outcome: create the CO-570 docs-first packet and registry mirrors so parent implementation can make review scope explicit in `change-bundle.json`, keep `docs-review` and bounded review behavior truthful, and avoid implicit scope inference from local checkout state.

## User Request Translation
- User intent / needs: define a docs-first packet for CO-570 that preserves the contract between `docs-review`, `change-bundle.json`, committed branch diff review, explicit review scope metadata, bounded review, uncommitted working tree review, and base diff review.
- Success criteria / acceptance:
  - all scoped packet and mirror files exist for `linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316`
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` include CO-570 traceability without rewriting unrelated registry rows
  - protected terms remain visible: `docs-review`, `change-bundle.json`, committed branch diff, explicit review scope, bounded review, uncommitted working tree, and base diff
  - parent-owned implementation is scoped to review/change-bundle scope truth, not Linear/GitHub lifecycle or unrelated review policy changes
- Constraints / non-goals:
  - this child lane edits only the declared docs/task packet and registry mirror files
  - no source code, tests, Linear state, workpad, PR lifecycle, GitHub, or review-handoff mutation
  - no full repo validation from this child lane
  - no broad rewrite of review semantics beyond preserving explicit scope metadata for the selected review surface

## Intent Checksum
- Exact phrases to preserve:
  - `docs-review`
  - `change-bundle.json`
  - `committed branch diff`
  - `explicit review scope`
  - `bounded review`
  - `uncommitted working tree`
  - `base diff`
- Protected artifact and surface names:
  - `CO-570`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
  - `docs/PRD-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
  - `docs/TECH_SPEC-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
  - `docs/ACTION_PLAN-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
  - `tasks/specs/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
  - `tasks/tasks-linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
  - `.agent/task/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316.md`
- Nearby wrong interpretations to reject:
  - "infer review scope from whether the working tree happens to be dirty"
  - "treat every bounded review as uncommitted working tree review"
  - "treat every docs-review run as a base diff review"
  - "drop committed branch diff context because `change-bundle.json` exists"
  - "broaden into PR lifecycle, GitHub review threads, or Linear state updates"
  - "change implementation or tests from the docs packet lane"

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| `docs-review` input | Review handoff may depend on local checkout shape or caller convention to know what scope is under review. | Review metadata should state the selected scope directly. | `docs-review` consumes or emits enough explicit review scope metadata for the reviewer to distinguish uncommitted working tree, committed branch diff, and base diff. | Changing review policy, reviewer model selection, or review lifecycle transitions. |
| `change-bundle.json` | A bundle can list changed paths and evidence without making the review surface unambiguous. | Bundle metadata should carry the selected review scope alongside changed paths and evidence. | Parent implementation records explicit review scope in `change-bundle.json` and keeps it stable across bounded review handoff. | Replacing the bundle format wholesale or changing unrelated bundle fields. |
| Committed branch diff | A committed branch diff can be confused with an uncommitted working tree or broad base diff. | A committed branch review should identify the committed branch diff as the active review surface. | Committed branch diff scope is named explicitly and remains reviewer-visible. | GitHub PR creation, PR check routing, or merge policy. |
| Uncommitted working tree | Uncommitted review can be inferred from dirty state, which is fragile. | Uncommitted working tree review should be explicit, not inferred. | Uncommitted working tree scope is encoded when selected. | Requiring all reviews to be uncommitted review. |
| Base diff | Base diff review can be broader or narrower than caller intent if the base is implicit. | Base diff review should carry explicit base-diff semantics. | Base diff scope is represented distinctly from committed branch diff and uncommitted working tree scope. | Changing how bases are calculated beyond the scoped parent implementation. |

## Not Done If
- The packet omits any protected term: `docs-review`, `change-bundle.json`, committed branch diff, explicit review scope, bounded review, uncommitted working tree, or base diff.
- Parent implementation can still silently infer review scope from dirty checkout state alone.
- `change-bundle.json` cannot distinguish committed branch diff, uncommitted working tree, and base diff review.
- The fix broadens into Linear mutation helpers, GitHub/PR lifecycle, review-handoff commands, or unrelated review policy changes.
- This child lane edits source code, tests, unlisted docs, or any file outside the declared file scope.

## Goals
- Create the CO-570 docs-first packet and registry mirrors.
- Preserve source anchor and object id for parent patch import.
- Make explicit review scope a first-class requirement for `docs-review` and `change-bundle.json`.
- Keep parent-owned implementation, validation, Linear state, and PR lifecycle separate from this docs-only child lane.

## Non-Goals
- No implementation or test edits.
- No `codex-orchestrator linear`, GitHub, PR, workpad, issue-context, transition, attach, or review-handoff commands.
- No full validation suite.
- No change to reviewer behavior beyond the parent-owned explicit review scope contract.
- No registry rewrite beyond the CO-570 rows/entries needed for traceability.

## Acceptance Criteria
- CO-570 PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, and `.agent` mirror exist.
- `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` include CO-570 packet traceability.
- Packet includes user request translation, protected terms, wrong interpretations to reject, explicit non-goals, `Not Done If`, and parity matrix.
- Parent-owned validation plan covers committed branch diff, uncommitted working tree, and base diff scope.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor check: no large refactor is warranted because the repair keeps authority in the existing review wrapper scope resolver and change-bundle producer instead of splitting it across unrelated provider-worker or PR lifecycle phases.
- Minor-seam behavior: acceptable only as an immediate expiry of implicit review-scope inference; no retained temporary runtime fallback remains after CO-570 records explicit requested/effective scope metadata.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review scope metadata | `docs-review` / bounded review scope can be inferred from caller state or checkout dirtiness instead of encoded in `change-bundle.json`. | expire fallback | CO-570 | Review bundle handoff cannot distinguish committed branch diff, uncommitted working tree, or base diff. | 2026-05-21 | 2026-05-22 | 2026-05-22 | Parent implementation writes explicit requested/effective review scope metadata that distinguishes committed branch diff, uncommitted working tree, and base diff review. | Focused change-bundle/docs-review regressions, scoped docs checks, manifest-backed standalone review, and pack smoke. |

## Technical Considerations
- `change-bundle.json` should remain the stable handoff artifact for review metadata.
- The selected review scope should be reviewer-visible and machine-readable enough for `docs-review` and bounded review tooling.
- Parent should keep the fix narrowly scoped to the review/change-bundle contract and avoid hidden lifecycle side effects.

## Open Questions
- Parent implementation must confirm the exact `change-bundle.json` schema seam and test location before source edits.
- Parent must decide whether base-diff details need a base ref field or a normalized scope enum plus existing base metadata.

## Approvals
- Product: parent CO-570 lane owns issue/workpad/Linear/PR reconciliation.
- Engineering: bounded same-issue child lane produced the docs-first packet and registry mirrors for parent patch export.
- Date: 2026-05-21
