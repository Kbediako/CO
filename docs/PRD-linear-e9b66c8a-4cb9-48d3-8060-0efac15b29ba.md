# PRD - CO-405 bounded-review validation command-intent classification

## Traceability
- Linear issue: `CO-405`
- Linear URL: https://linear.app/asabeko/issue/CO-405
- Task id: `linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba`
- Canonical spec: `tasks/specs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`
- Child lane manifest: `.runs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba-docs-packet/cli/2026-04-28T12-03-31-458Z-f7277f31/manifest.json`
- Source anchor: `ctx:sha256:abfa2d4776ef4351126ffc600e3e5d6a6fd85919935405d0589023547317c6a5#chunk:c000001`
- Source payload path from handoff: `.runs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba-docs-packet/cli/2026-04-28T12-03-31-458Z-f7277f31/memory/source-0/source.txt`
- Source payload note: the referenced payload path is absent in this child checkout; this packet uses the parent-provided issue-shaping prompt and source anchor only.

## Summary
- Problem Statement: bounded standalone review can still drift into repo-local validation commands such as the CO validation floor or focused test runners. Those commands belong to the parent validation phase, not the reviewer, so review telemetry must classify the attempt as a `command-intent` violation instead of treating it as reviewer evidence or an ordinary shell probe.
- Desired Outcome: repo-local validation commands attempted inside bounded review terminate on the command-intent boundary, preserve truthful telemetry, and allow only the existing bounded read-only retry path to produce a verdict without executing validation.

## User Request Translation
- User intent / needs: create the CO-405 docs-first packet for a narrow implementation lane that classifies repo-local validation commands as bounded-review command-intent violations.
- Success criteria / acceptance:
  - PRD, canonical TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, and `tasks/index.json` registration exist for `linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba`.
  - The packet preserves the protected review terms: `bounded-review command-intent violations`, `repo-local validation commands`, `command-intent`, `validation-suite`, `validation-runner`, `failed-boundary`, `bounded-success`, and `termination_boundary`.
  - The target contract says bounded review must not execute repo-local validation commands, including CO handoff commands such as `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `npm run pack:smoke`, `node scripts/spec-guard.mjs --dry-run`, `node scripts/diff-budget.mjs`, and focused `npx vitest` validation runs.
  - Telemetry distinguishes blocked validation-command attempts from product findings and keeps the original command, boundary kind, and validation provenance available to the parent.
  - Retry behavior remains bounded: one read-only no-validation retry may produce `bounded-success`; repeated validation intent fails closed as `failed-boundary`.
- Constraints / non-goals:
  - no implementation or test edits in this child lane
  - no Linear mutation helpers, workpad updates, GitHub commands, PR lifecycle, or issue-state transitions
  - no full repo validation from this child lane
  - no broad review-wrapper redesign, outcome taxonomy rewrite, command-probe extraction, or meta-surface policy work

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-405`
  - `bounded-review validation command-intent classification`
  - `repo-local validation commands`
  - `bounded-review command-intent violations`
  - `classification/telemetry/retry behavior`
- Protected terms / exact artifact and surface names:
  - `command-intent`
  - `validation-suite`
  - `validation-runner`
  - `failed-boundary`
  - `bounded-success`
  - `termination_boundary`
  - `review_outcome`
  - `codex-orchestrator review`
  - `npm run review`
- Nearby wrong interpretations to reject:
  - "the reviewer should run the validation command and report the output"
  - "a validation command inside bounded review is a low-signal shell probe instead of a hard command-intent boundary"
  - "blocked validation attempts can be flattened into product findings"
  - "the retry may drop the original review scope or execute a smaller validation command"
  - "CO-405 should rewrite the review wrapper or validation floor"

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| Repo-local validation command attempts | Bounded review can surface command-intent residue when it tries to run validation or orchestration commands. | Parent/provider worker owns validation commands outside the bounded review. | Any repo-local validation command attempted by the reviewer is classified as a `command-intent` violation with validation provenance. | Letting bounded review execute validation to gather evidence. |
| Telemetry | Review output must be auditable after boundary termination or retry. | CO review closeout needs separate product findings and boundary diagnostics. | `termination_boundary.kind=command-intent` plus `validation-suite` or `validation-runner` provenance is retained and counted separately from findings. | Flattening boundary evidence into `clean-success` or product findings. |
| Retry behavior | Command-intent retry exists to give one no-validation chance while preserving fail-closed behavior. | Retry must be read-only, scope-preserving, and auditable. | First validation-command boundary can retry once; a second validation-command attempt fails closed as `failed-boundary`; a read-only verdict is `bounded-success`. | Changing unrelated retry policies or adding new fallback paths. |

## Not Done If
- A bounded reviewer can run `npm run test`, focused `npx vitest`, `npm run docs:check`, `node scripts/spec-guard.mjs --dry-run`, or another repo-local validation command as part of review evidence.
- Telemetry hides the blocked validation command, omits `termination_boundary.kind=command-intent`, or loses `validation-suite` / `validation-runner` provenance.
- A retry drops the requested review scope, performs a smaller validation command, or reports `clean-success` without boundary evidence after a validation-command boundary occurred.
- Product findings and blocked validation-command attempts cannot be distinguished in the manifest, telemetry, or summary.
- The implementation widens into Linear/GitHub lifecycle, full validation execution, command-probe extraction, meta-surface policy, or a broad review-wrapper redesign.

## Goals
- Define the CO-405 docs-first implementation contract.
- Classify repo-local validation commands as bounded-review command-intent violations.
- Preserve strict no-validation review behavior while allowing the bounded read-only retry to produce a verdict.
- Preserve telemetry and summary evidence for boundary classification, validation provenance, and retry outcome.

## Non-Goals
- No code or test changes in this child lane.
- No execution of parent validation commands from bounded review.
- No weakening of manifest-backed standalone review, `FORCE_CODEX_REVIEW`, provider handoff, or command-intent enforcement.
- No unrelated review-wrapper, command-probe, meta-surface, startup-anchor, or validation-floor refactor.
- No Linear state, workpad, PR, GitHub, or lifecycle work.

## Stakeholders
- Product: CO operators relying on bounded review as review evidence rather than hidden validation execution.
- Engineering: maintainers of standalone-review command-intent classification, review telemetry, and provider-worker review handoff.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - repo-local validation commands inside bounded review terminate with `command-intent` classification
  - telemetry preserves boundary kind, validation provenance, command text, retry count, and outcome
  - repeated validation-command intent fails closed
  - read-only retry can produce `bounded-success` without hiding the boundary
- Guardrails / Error Budgets:
  - zero validation command execution by bounded review
  - zero scope-dropping retries
  - zero child-lane edits outside the declared docs packet and `tasks/index.json`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: `justify retaining fallback` for the existing bounded command-intent retry contract.
- Contract name: bounded-review command-intent retry.
- Owning surface: standalone review execution boundary and telemetry.
- Owner: CO-405 parent implementation lane.
- Introduced date: existing review-wrapper safety contract before 2026-04-28.
- Review date: 2026-04-28.
- Rationale: the retry is a durable safety contract, not a workaround. It gives one read-only chance for a verdict after a blocked validation-command attempt while preserving fail-closed behavior and boundary telemetry.
- Large-refactor check: a broad review-wrapper rewrite is not required; the target implementation should stay at classifier, telemetry, retry, and focused regression scope unless parent source inspection proves the command-intent boundary is split across multiple ownership seams.

## Open Questions
- Parent implementation should confirm the exact classifier entry points and focused test files before editing source.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-28.
