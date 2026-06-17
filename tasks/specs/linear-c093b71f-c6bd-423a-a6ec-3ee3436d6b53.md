---
id: linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53
title: CO-542 deterministic quota hygiene audit
relates_to: docs/PRD-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md
risk: medium
owners:
  - Codex
last_review: 2026-06-17
related_action_plan: docs/ACTION_PLAN-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md
task_checklists:
  - tasks/tasks-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md
review_notes:
  - 2026-06-17: Reviewed during the hard spec-guard freshness tranche; kept active because this file did not contain terminal evidence sufficient for archival or inactive reclassification.
---

# TECH_SPEC - CO-542 deterministic quota hygiene audit

## Canonical Reference
- PRD: `docs/PRD-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- Task checklist: `tasks/tasks-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- Agent task mirror: `.agent/task/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- Linear issue: `CO-542` / `c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- Source anchor: `ctx:sha256:907f29dadf81e0e1954977486d717302a4460e0f8c6476a75ca1a9b3ed0d49d1#chunk:c000001`

## Summary
- Objective: define a read-only, zero-model deterministic quota hygiene audit that classifies quota/auth/delegate/provider-intake evidence without default mutations or stale-state promotion.
- Scope:
  - docs-first packet and registry mirrors in this child lane
  - future parent-owned audit/report command or mode
  - deterministic classification of confirmed, uncorroborated, stale, and unknown evidence
- Constraints:
  - no implementation or test edits in this child lane
  - no Linear/GitHub commands from this child lane
  - no full repo validation suites from this child lane
  - no model calls, review agents, or default mutations in the audit's normal path

## Issue-Shaping Contract
- User-request translation carried forward: CO-542 should become a deterministic quota hygiene audit, not a model-backed repair loop, and it should help parent operators separate real quota/WIP blockers from stale provider-intake, app-managed delegate, or unknown cross-thread signals.
- Protected terms / exact artifact and surface names: `zero-model deterministic quota hygiene audit`, `no default mutations`, `unknown cross-thread goals remain unknown`, `app-managed delegate false positives require corroboration`, `stale provider-intake claims are not live WIP without live evidence`, `provider-intake-state.json`, `co-status`, `control-host`, `live WIP`.
- Nearby wrong interpretations to reject: model-backed review as audit, default/model mutation, queue-cap changes, stale memory as truth, provider-intake manual cleanup, and app-managed delegate rows as authoritative without corroboration.
- Explicit non-goals carried forward: no implementation/test edits by this child lane, no Linear/GitHub lifecycle work, no broad provider-intake/status redesign.

## Parity / Alignment Matrix
- Current truth: parent supervision can see quota/auth/delegate/provider-intake signals, but stale or app-managed surfaces can be ambiguous.
- Reference truth: deterministic quota hygiene should read current evidence without spending model quota or changing defaults.
- Target truth / intended delta: parent implementation emits a stable report that labels confirmed blockers, stale evidence, uncorroborated app-managed delegate signals, and unknown cross-thread goals distinctly.
- Explicitly out-of-scope differences: default mutation, model selection changes, live queue mutation, PR/Linear lifecycle, and provider-intake rewrites.

## Readiness Gate
- Not done if:
  - the audit spends model quota or launches model-backed review in the normal path
  - the audit changes defaults, model picker settings, provider caps, queue state, or persisted issue state
  - unknown cross-thread goals are coerced into clean/blocked/active without current evidence
  - app-managed delegate false positives or stale provider-intake rows affect live WIP/quota conclusions without corroboration
- Pre-implementation issue-quality review evidence:
  - child-lane prompt explicitly scopes this to docs-only packet creation and preserves the protected CO-542 issue wording.
  - source-0 anchor confirms CO-542 issue provenance and parent-run manifest path; source payload does not include additional implementation authority.
- Safeguard ownership split:
  - parent lane owns Linear state, workpad, implementation, review, and PR lifecycle
  - this child lane owns only the docs packet and canonical registry/index mirrors

## Technical Requirements
- Functional requirements for parent implementation:
  - Provide a deterministic audit/report path that performs no model calls.
  - Read existing local/config/control-host/provider-intake/delegate evidence without mutating defaults or runtime state.
  - Classify each finding with source, timestamp where available, evidence strength, and status such as `confirmed`, `uncorroborated`, `stale`, or `unknown`.
  - Preserve `unknown` for cross-thread goals unless a current source proves a concrete state.
  - Require corroborating run/process/manifest/parent evidence before app-managed delegate signals become active quota blockers.
  - Require live worker, run, Linear, or control-host evidence before provider-intake rows count as live WIP.
  - Keep stale provider-intake rows available as audit history without treating retained history as active capacity.
- Non-functional requirements:
  - deterministic output for identical inputs
  - zero model quota consumption
  - read-only by default
  - fail closed on missing or ambiguous evidence
  - machine-readable output suitable for parent routing and regression fixtures
- Interfaces / contracts:
  - quota hygiene audit output schema
  - local Codex config/default readers
  - co-status/control-host status artifacts
  - provider-intake retained claim records
  - delegate/child-lane/run manifest readers

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale provider-intake WIP inference | Cached provider-intake rows can look like active WIP after live state changed. | `remove fallback` | CO-542 | Audit sees provider-intake row without live worker/run/Linear/control-host proof. | Existing provider-intake retained-history behavior | 2026-05-17 | This issue | Audit classifies the row as stale or uncorroborated instead of live WIP. | Focused deterministic fixture for stale provider-intake claim. |
| App-managed delegate visibility | App-managed delegate state can look like repo-local active child/delegate ownership. | `remove fallback` | CO-542 | Delegate row lacks current run/process/manifest or parent corroboration. | Existing app-managed delegate visibility | 2026-05-17 | This issue | Audit reports uncorroborated app-managed delegate evidence and avoids quota-blocker escalation. | Focused deterministic fixture for false-positive delegate signal. |
| Cross-thread goal status | Remote or app-managed thread goal state may be missing or stale. | `justify retaining fallback` | Parent CO supervision | Current authoritative evidence is unavailable. | Existing parent-session supervision behavior | 2026-05-17 | Durable uncertainty contract | A live source or parent-approved artifact proves a concrete status. | Report schema preserves `unknown` and evidence reason. |

- Contract name: quota hygiene deterministic evidence classification.
- Owning surface: parent CO supervision / quota hygiene audit.
- Steady-state proof: uncorroborated and unknown states remain distinct from confirmed quota blockers.
- Tests/docs: this CO-542 docs packet plus future focused deterministic fixtures.
- Non-expiring rationale: uncertainty preservation protects parent-session orchestration from stale or cross-thread hallucinated status.
- Large-refactor check: not required for the packet; parent implementation should add a read-only evidence classifier instead of replacing provider-intake or status authority.
- Minor-seam decision: acceptable because the audit labels evidence and uncertainty without becoming a new runtime authority.

## Architecture & Data
- Architecture / design adjustments:
  - Parent implementation should isolate evidence collection from classification so deterministic fixtures can cover ambiguous cases.
  - Avoid ad hoc status inference when a structured artifact exists.
  - Report retained history as retained history, not current live WIP, unless corroborated by live evidence.
- Data model changes / migrations:
  - No persisted migration expected for the audit itself.
  - Any report schema should include version, generated timestamp, inputs, findings, and evidence classification.
- External dependencies / integrations:
  - No new external dependency should be required for the zero-model audit.
  - Parent may optionally supply live Linear/GitHub evidence, but the audit must preserve `unknown` when such evidence is absent.

## Validation Plan
- Tests / checks for parent implementation:
  - focused deterministic fixture: stale provider-intake row without live evidence is not live WIP
  - focused deterministic fixture: app-managed delegate false positive remains uncorroborated
  - focused deterministic fixture: unknown cross-thread goal remains `unknown`
  - focused deterministic fixture: confirmed live worker/run evidence can promote WIP status
  - JSON/schema validation for audit output
  - targeted diff hygiene and focused test command only for touched implementation/tests
- Rollout verification:
  - parent runs the audit against the current supervision workspace and records output in the CO-542 workpad/PR evidence.
- Monitoring / alerts:
  - parent decides whether audit findings are advisory or blocking; the audit itself should report classification without mutating state.

## Open Questions
- Final command surface and output filename.
- Exact corroboration threshold for app-managed delegate entries when only parent-session UI state is visible.
- Whether parent should add docs-hygiene coverage for the new audit command help text.

## Approvals
- Reviewer: parent provider-worker lane.
- Date: 2026-05-17.
