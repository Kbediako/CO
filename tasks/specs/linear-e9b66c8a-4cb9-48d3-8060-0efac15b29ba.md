---
id: linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba
title: CO-405 bounded-review validation command-intent classification
status: in_progress
owner: Codex
created: 2026-04-28
last_review: 2026-04-28
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md
related_action_plan: docs/ACTION_PLAN-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md
related_tasks:
  - tasks/tasks-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md
review_notes:
  - 2026-04-28: bounded same-issue child lane created a docs-only packet from parent-provided issue context; the referenced source payload path was absent in the child checkout.
---

# Technical Specification

## Context

CO-405 hardens bounded standalone review by treating repo-local validation commands as command-intent violations. Validation commands are parent/provider-worker closeout work, not reviewer work. A bounded reviewer that tries to run those commands should be stopped, recorded, and either retried once in a read-only no-validation posture or failed closed.

## Issue-Shaping Contract
- User-request translation carried forward: classify repo-local validation commands as bounded-review command-intent violations and preserve the classification, telemetry, and retry contract.
- Protected terms / exact artifact and surface names:
  - `bounded-review validation command-intent classification`
  - `repo-local validation commands`
  - `bounded-review command-intent violations`
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
  - bounded review may execute validation commands to gather review evidence
  - validation-command attempts are ordinary shell probes
  - help-only repo guard lookups are validation executions
  - telemetry can hide or flatten blocked validation attempts
  - retry can drop scope or run a smaller validation command
  - CO-405 should become a broad review-wrapper redesign
- Explicit non-goals carried forward:
  - no Linear/GitHub/workpad/PR lifecycle work
  - no changes to validation command definitions or validation floor behavior
  - no command-probe, meta-surface, startup-anchor, or broad outcome-taxonomy refactor

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Validation command ownership | CO validation commands run outside bounded review. | Parent/provider worker owns validation and closeout. | Reviewer attempts to run repo-local validation are blocked as command intent. | Running validation inside review, even read-only. |
| Command-intent classification | Existing command-intent boundaries protect review from orchestration and validation drift. | Repo-local validation commands are validation intent, not product findings. | Validation suites, focused runners, and repo guard scripts classify as `command-intent` with validation provenance; help-only lookups stay read-only. | Generic shell-probe extraction or unrelated command parser refactors. |
| Telemetry and summary | Review closeout must explain whether a verdict, boundary, retry, or failure occurred. | Boundary diagnostics must remain separate from product findings. | Telemetry retains command text, `termination_boundary.kind=command-intent`, `validation-suite` or `validation-runner` provenance, retry count, and final `review_outcome`. | Flattening into `clean-success` or hiding boundary history. |
| Retry | One bounded retry can recover from command-intent drift. | Retry is read-only, scope-preserving, and fail-closed. | First validation boundary may retry once; repeated validation intent is `failed-boundary`; read-only verdict after retry is `bounded-success`. | Adding new fallback paths or changing unrelated retry behavior. |

## Readiness Gate
- Not done if:
  - bounded review can execute repo-local validation commands
  - telemetry omits boundary kind, validation provenance, command text, retry count, or final outcome
  - product findings and blocked validation attempts are indistinguishable
  - retry drops review scope or runs validation
  - implementation touches Linear/GitHub lifecycle, validation command definitions, or unrelated review-wrapper policy
- Pre-implementation issue-quality review evidence:
  - 2026-04-28: the scope is specific to validation command classification, telemetry, and retry behavior; it rejects both a docs-only wording fix and a broad review-wrapper rewrite.
- Safeguard ownership split:
  - child lane owns this docs packet and `tasks/index.json` only
  - parent lane owns source inspection, implementation, focused tests, validation, workpad, Linear state, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Classify repo-local validation command attempts made by bounded review as `command-intent` violations.
  2. Preserve validation provenance as `validation-suite` or `validation-runner` based on the detected command family.
  3. Include the validation-command surface inventory below, including focused package-script aliases, direct runners, repo-local guard scripts, and temp-repo absolute guard script repro commands.
  4. Preserve telemetry fields that let the parent distinguish product findings from blocked validation-command attempts.
  5. Preserve bounded retry behavior: one scope-preserving read-only retry after the first validation-command boundary; fail closed on repeated validation intent; report `bounded-success` only when the retry yields a read-only verdict.
- Non-functional requirements:
  - no validation command execution inside bounded review
  - no hidden or flattened boundary telemetry
  - no source/test changes from this child lane
  - smallest parent implementation that satisfies classifier, telemetry, retry, and focused regression needs
- Interfaces / contracts:
  - bounded review command-intent classifier
  - review execution telemetry / manifest summary
  - review retry policy for command-intent boundaries
  - focused parent-owned tests for classifier, telemetry, and retry behavior

## Validation-Command Surface Inventory
- Package-manager validation suites: `npm run build`, `npm run lint`, `npm run test`, `npm run test:*`, `npm run eval:test`, `npm run docs:check`, `npm run docs:freshness`, `npm run docs:freshness:maintain`, `npm run repo:stewardship`, and `npm run pack:smoke`.
- Node package-script validation suites: `node --run test:*`, including focused file selectors passed after `--`.
- Repo-local guard and closeout scripts: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, temp-repo absolute `node /path/to/CO/scripts/spec-guard.mjs --dry-run`, `node scripts/diff-budget.mjs`, and `scripts/run-test-all.mjs`.
- Direct validation runners: focused `npx vitest`, `npm exec -- vitest`, `bunx jest`, `python -m pytest`, and launcher/path variants that resolve to `vitest`, `jest`, or `pytest`.
- Help-only guard/script lookups such as `node scripts/spec-guard.mjs --help`, `scripts/spec-guard.mjs -h`, and `node --run docs:freshness -- --help` are not validation execution and must stay outside the command-intent boundary.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Standalone review execution boundary | Bounded command-intent retry after validation-command boundary | `justify retaining fallback` | CO-405 parent implementation lane | Bounded reviewer attempts a repo-local validation command | Existing safety contract before 2026-04-28 | 2026-04-28 | Non-expiring durable safety contract | Remove only when a replacement closeout contract preserves no-validation guidance, scope preservation, fail-closed repeated boundary handling, and telemetry truth | Focused tests cover first-boundary retry, repeated-boundary failure, and `bounded-success` read-only retry outcome. |
| Review telemetry | Boundary classification and validation provenance fields | `justify retaining fallback` | CO-405 parent implementation lane | Any command-intent boundary or retry | Existing audit contract before 2026-04-28 | 2026-04-28 | Non-expiring audit contract | Remove only with a replacement telemetry schema that preserves command text, boundary kind, validation provenance, retry count, and final outcome | Focused telemetry tests prove boundary diagnostics stay separate from product findings. |

- Large-refactor check: this lane should not require a large refactor. A bounded classifier/telemetry/retry patch is acceptable unless parent source inspection proves validation intent is split across multiple lifecycle phases or ownership seams.

## Architecture & Data
- Architecture / design adjustments:
  - Parent should add or adjust the command-intent classification rules where bounded review already interprets reviewer shell intent.
  - Parent should keep retry policy scope-preserving and fail-closed.
  - Parent should update summary/telemetry only enough to keep validation-command boundary evidence visible and separate from findings.
- Data model changes / migrations:
  - No persistent data migration expected.
  - Telemetry shape may gain or preserve explicit validation provenance fields if current fields are insufficient.
- External dependencies / integrations:
  - None in this child lane.

## Validation Plan
- Child-lane checks:
  - JSON parse for `tasks/index.json`
  - scoped whitespace/diff check over the declared docs packet files
- Parent-owned checks:
  - docs-review or equivalent packet review before implementation
  - focused command-intent classifier tests for CO validation commands
  - focused telemetry tests for `termination_boundary`, validation provenance, retry count, and `review_outcome`
  - focused retry tests covering first validation boundary, repeated validation boundary, and read-only retry `bounded-success`
  - normal parent validation floor before review handoff

## Open Questions
- Parent source inspection should confirm whether the current classifier already separates `validation-suite` and `validation-runner` provenance for every command listed in this packet.

## Approvals
- Reviewer: bounded same-issue child lane.
- Date: 2026-04-28.
