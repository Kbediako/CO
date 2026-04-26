# Fallback Expiry and Refactor Policy

Last reviewed: 2026-04-26

Use this policy when a task adds, retains, or touches any fallback, compatibility branch, legacy projection, cached proof path, break-glass route, or small seam in the repo. The named high-churn CO control surfaces below use the tighter high-churn caps and refactor triggers.

The governed high-churn surfaces are:

- `provider workflow`
- `review wrapper`
- `runtime routing`
- `docs freshness ownership`
- `control-host status surfaces`

## Required Decision

Every touched fallback or seam in a fallback-facing task must carry exactly one decision before implementation:

| Decision | Use when | Required evidence |
| --- | --- | --- |
| `remove fallback` | The fallback is stale, unreachable, redundant with current behavior, or cannot name a live trigger. | Removal diff, regression coverage or docs-gate evidence, and no retained owner metadata. |
| `expire fallback` | The fallback is still needed temporarily while a migration, provider drift, or external blocker is resolved. | Owner issue, trigger, introduced date, review date, maximum lifetime, removal condition, and validation. |
| `justify retaining fallback` | The branch is a durable compatibility contract, not temporary fallback debt. | Contract name, owning surface, proof that it is steady-state behavior, tests/docs that describe it as a supported path, and a reason it is not governed as an expiring fallback. |

If a retained branch cannot supply the `expire fallback` metadata and cannot prove it is a durable compatibility contract, the task is not ready for implementation.

## Expiry Mechanics

Retained fallbacks must record these fields in the PRD, TECH_SPEC, action plan, or task checklist:

- **Owner**: a named Linear issue, canonical owner key, or explicitly named maintainer lane. "Future cleanup" is not an owner.
- **Trigger**: the exact condition that activates the fallback, including input/source names and the expected event or failure mode.
- **Introduced date**: the date the fallback first landed or the oldest known date if inherited.
- **Review date**: the next date an agent must re-check whether the removal condition is true.
- **Allowed maximum lifetime**: the latest date the fallback may remain without a new issue-quality review.
- **Removal condition**: a machine-checkable or reviewer-verifiable condition that makes removal safe.
- **Validation**: the focused test, docs gate, canary, or manual proof that protects both the fallback and its removal path.

Maximum lifetimes:

| Surface / fallback type | Review date cap | Maximum lifetime |
| --- | --- | --- |
| High-churn control surfaces named above | 14 days from introduction or current review | 30 days |
| General repo fallback outside the named surfaces | 30 days from introduction or current review | 60 days |
| Security, auth, PII, customer-impacting, financial, or production-impact fallback | 7 days from introduction or current review | 14 days |
| External ecosystem migration or release compatibility bridge | 30 days from introduction or current review | 90 days only with a named owner issue, deprecation plan, and reviewer approval |

An expired fallback blocks review handoff unless the task removes it, refreshes the owner/review evidence through a new issue-quality review, or moves the task to a real blocked state with the dependency recorded.

## Large-Refactor Preference

Prefer a large refactor over another minor seam when any of these are true:

- The same governed surface already has two active fallbacks or compatibility branches for the same lifecycle.
- The proposed fallback would touch three or more files/modules, or two or more lifecycle phases such as intake, execution, review, merge, status, or docs.
- The fallback exists because authority is split across live state, cached state, stale manifests, legacy proof fields, or synthesized status rows.
- The fallback would add another `legacy_*`, `fallback_*`, `*_fallback`, cached proof, or last-known-good path without removing an older one.
- The removal condition cannot be stated as a machine-checkable or reviewer-verifiable condition.
- Tests need multiple compatibility fixtures to prove the same semantic outcome.
- A prior task on the same surface already deferred consolidation to a follow-up and the follow-up is still open.

A minor seam is acceptable only when all of these are true:

- It is scoped to one surface and one lifecycle phase.
- It does not create a new public or operator-facing contract.
- It has `expire fallback` metadata with a maximum lifetime no longer than the applicable cap.
- It has focused validation for both activation and non-activation paths.
- It does not obscure which source of truth wins.

## Surface-Specific Triggers

Provider workflow:
- Prefer a large refactor when provider issue identity, claim state, transition state, or autopilot snapshots need another fallback mapping to decide what is current.

Review wrapper:
- Prefer a large refactor when prompt transport, scoped-title retry, generated fallback notes, review telemetry classification, and manual fallback evidence have to be reasoned about together.

Runtime routing:
- Prefer a large refactor when `appserver` / `cli` routing, cloud fallback, command selection, or canary behavior needs another branch to keep mode semantics true.

Docs freshness ownership:
- Prefer a large refactor when owned rolling debt, canonical owner reuse, cohort maintenance, and freshness gate exceptions can no longer name a bounded expiry.

Control-host status surfaces:
- Prefer a large refactor when CLI, API, `/ui/data.json`, selected-run projection, compatibility issue projection, or legacy proof hydration disagree and another fallback would hide source authority.

## Docs-First Prompt

Any task that adds, retains, or touches fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior must include this table in the PRD, TECH_SPEC, or checklist:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<surface>` | `<branch or behavior>` | `remove fallback` / `expire fallback` / `justify retaining fallback` | `<issue or owner>` | `<activation condition>` | `<YYYY-MM-DD>` | `<YYYY-MM-DD>` | `<days/date>` | `<condition>` | `<test/gate/proof>` |

The table may say `Not applicable` only when the task does not add, retain, or touch any fallback, compatibility branch, legacy projection, cached proof path, break-glass route, or minor seam.

## Existing Fallback-Heavy Areas

CO-382 identified these fallback-heavy areas for follow-up ownership:

- Provider workflow: `orchestrator/src/cli/control/providerIssueHandoff.ts` contains provider-id mapping fallbacks and autopilot retained-claim fallback logic. Owner follow-up: `CO-394`.
- Review wrapper: `scripts/lib/review-launch-attempt.ts`, `scripts/run-review.ts`, and `docs/standalone-review-guide.md` contain scoped prompt retry, title fallback, generated fallback notes, and bounded-review fallback contracts. Owner follow-up: `CO-395`.
- Runtime routing: `orchestrator/src/cli/runtime/provider.ts`, `orchestrator/src/cli/runtime/codexCommand.ts`, `scripts/runtime-mode-canary.mjs`, and cloud-mode docs contain appserver-to-CLI and cloud fallback contracts. Owner follow-up: `CO-396`.
- Docs freshness ownership: `scripts/docs-freshness-maintain.mjs` and `docs/guides/docs-freshness-cohorts.md` contain owned rolling-debt fallback behavior that needs explicit expiry caps. Owner follow-up: `CO-397` with canonical owner key `docs:freshness:maintain`.
- Control-host status surfaces: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, and `orchestrator/src/cli/control/controlRuntime.ts` contain legacy proof/status fallback projection paths. Owner follow-up: `CO-398`.
