---
id: 20260428-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3
title: "CO-400 provider issue current-state authority and issue-context label projection"
relates_to: docs/PRD-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
related_action_plan: docs/ACTION_PLAN-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md
task_checklists:
  - tasks/tasks-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md
---

# TECH_SPEC - CO-400 provider issue current-state authority and issue-context label projection

## Canonical Reference
- PRD: `docs/PRD-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- Canonical task spec: `tasks/specs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- Task checklist: `tasks/tasks-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- Linear issue: `CO-400`
- Source anchor: `ctx:sha256:f92e935a0e7a99898f24e320414e1c8a7cc9bc966dbf796b8c606abad73b6446#chunk:c000001`

## Summary
- Objective: carry Linear issue labels through `linear issue-context` as live current-state authority rather than omitting, inferring, or projecting them from fallback state.
- Scope:
  - `buildIssueContextQuery` label nodes
  - `ProviderLinearIssueContext` label model
  - `parseIssueContext` live parsing
  - `parseCachedIssueContext` and `writeCachedIssueContextRecord` cache preservation
  - `summarizeIssueContext` / CLI JSON output
  - focused `ProviderLinearWorkflowFacade` and `LinearCliShell` tests
- Constraints:
  - no CO-398 control-host status fallback rework
  - no expected-state weakening
  - no fallback label projection
  - no source/test edits in this docs-only child lane

## Issue-Shaping Contract
- User-request translation carried forward: labels are part of live Linear issue current-state and must be projected by `linear issue-context` through the live GraphQL query, typed issue context, live parse, cached parse/write, summary/JSON output, and focused tests.
- Protected terms / exact artifact and surface names:
  - `issue-context label projection`
  - `live Linear issue current-state`
  - `cached snapshots preserve labels`
  - `no fallback projection`
  - `provider workers must not infer unlabeled from omitted labels`
  - `codex-orchestrator linear issue-context`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `LinearIssueContextQueryResponse`
  - `ProviderLinearIssueContext`
  - `buildIssueContextQuery`
  - `parseIssueContext`
  - `parseCachedIssueContext`
  - `writeCachedIssueContextRecord`
  - `buildIssueSummaryQuery`
  - `summarizeIssueContext`
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - `orchestrator/tests/LinearCliShell.test.ts`
- Nearby wrong interpretations to reject:
  - labels as display-only metadata outside provider current-state authority
  - fallback label projection from local or provider-worker state
  - omitted `labels` meaning the issue is known to be unlabeled
  - live-query-only changes that leave cache, summaries, or CLI JSON stripping labels
  - CO-398 status fallback rework or expected-state weakening
- Explicit non-goals carried forward:
  - do not rework CO-398 control-host status fallback decisions
  - do not weaken expected-state checks
  - do not hide Linear/provider disagreement behind fallback projection
  - do not mutate Linear, workpads, PR lifecycle, source code, or tests from this child lane

## Label Projection Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| GraphQL issue-context query | Issue label nodes are absent. | Labels are part of live Linear issue current-state. | Query includes label nodes with stable id/name metadata. | Unrelated Linear metadata expansion. |
| Typed issue context | `ProviderLinearIssueContext` cannot carry labels. | Current-state model should represent known labels. | Issue context carries a JSON-safe label list. | Reworking unrelated issue-context fields. |
| Live parse | Parsed live context drops labels because the type/query omit them. | Live parser preserves labels returned by Linear. | `parseIssueContext` validates and stores labels. | Forgiving malformed unrelated fields. |
| Cache parse/write | Cache records can strip labels or omit them forever. | Cache snapshots preserve known current-state labels. | `parseCachedIssueContext` and `writeCachedIssueContextRecord` round-trip labels. | Treating legacy omitted labels as known empty labels. |
| Summary / CLI JSON | Machine output cannot expose label truth. | CLI JSON should include labels when known. | `summarizeIssueContext` and `linear issue-context --format json` include labels. | Human formatting redesign. |
| Tests | No focused label projection coverage. | Current-state authority changes need regression coverage. | Facade/CLI tests pin live, cache, JSON, and omitted-label safety. | Full validation from this child lane. |

## Readiness Gate
- Not done if:
  - known Linear labels do not appear in `linear issue-context --format json`
  - cache write/read strips labels
  - omitted `labels` is treated as authoritative unlabeled state
  - fallback projection supplies labels
  - only live query or only display output is updated
  - CO-398 fallback decisions or expected-state checks are changed
- Pre-implementation issue-quality review evidence:
  - 2026-04-28: the packet preserves the issue intent as a label-current-state authority lane and is not narrower than the user request because it names GraphQL, typed model, live parse, cached parse/write, summary/CLI JSON, and focused tests.
  - 2026-04-28: micro-task path is unavailable because the issue touches cached snapshots, fallback-projection rejection, current-state authority, exact protected terms, and parity/alignment semantics.
- Safeguard ownership split:
  - parent lane owns source implementation, tests, Linear state, workpad, PR lifecycle, review, and final validation
  - this child lane owns only docs/task packet files declared in scope

## Technical Requirements
- Functional requirements:
  - Extend the live issue-context GraphQL query to request Linear label nodes.
  - Add a label representation to `ProviderLinearIssueContext`.
  - Parse live label nodes from `LinearIssueContextQueryResponse` without accepting malformed label records as valid current-state truth.
  - Preserve labels when writing and reading cached issue-context records.
  - Treat older cached snapshots without `labels` as non-authoritative for issue-context reuse so they force fresh live authority instead of projecting known empty labels.
  - Include labels in issue summaries and CLI JSON output when labels are known.
  - Ensure consumers cannot infer `unlabeled` from omitted labels unless the live Linear response or cache explicitly contains an empty known label list.
- Non-functional requirements:
  - Keep the change narrow to issue-context current-state authority.
  - Preserve expected-state checks and fail-closed provider-worker behavior.
  - Keep label-aware cache records stable while refusing omitted-label records as current-state authority.
  - Avoid new Linear reads outside the issue-context query path.
- Interfaces / contracts:
  - `codex-orchestrator linear issue-context --format json` exposes the label list in the machine-readable issue payload.
  - Pre-CO-400 cache records that omit `labels` are not reused as authoritative issue-context snapshots.
  - Facade and CLI tests document the known-empty versus omitted/unknown distinction.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Live issue-context projection | Labels omitted from live current-state GraphQL projection. | remove fallback | CO-400 | Provider worker reads issue context for Linear current state. | existing issue-context behavior | N/A after removal | N/A after removal | Label nodes are queried and parsed as current-state truth. | Focused facade live-parse regression. |
| Cached issue-context snapshots | Cache parse/write can strip labels or make omitted labels appear authoritative. | remove fallback | CO-400 | Issue-context cache is written or read after label-aware live context exists. | existing cache behavior | N/A after removal | N/A after removal | Known labels round-trip; omitted legacy labels remain unknown/not projected. | Cache round-trip and legacy omitted-label safety regressions. |
| Provider-worker label state | Local/provider fallback projection or omitted-label inference substitutes for live Linear labels. | remove fallback | CO-400 | Consumer needs label state from issue context. | existing omission behavior | N/A after removal | N/A after removal | Consumers use live/cached labels only and cannot treat omission as unlabeled. | CLI JSON and provider-facing facade assertions. |

- For `justify retaining fallback`: Not applicable. No temporary fallback is approved by this packet.
- Large-refactor check: CO-400 is already the current-state authority consolidation lane for label projection. Keep the change narrow to issue-context labels unless source inspection proves labels are inseparable from a larger authority split. Do not move CO-398 status fallback decisions into this lane.

## Architecture & Data
- Architecture / design adjustments:
  - Add one shared label record parser/shape near existing issue-context parsing helpers.
  - Thread that shape through live parse, cache parse/write, summary, and CLI output instead of adding parallel label projection paths.
  - Represent omitted legacy cache labels by rejecting the stale cache record for issue-context reuse and documenting the conservative behavior in tests.
- Data model changes / migrations:
  - No migration expected.
  - Existing cache records without `labels` force a fresh live read before issue-context authority is returned.
  - Newly written cache records include labels when known.
- External dependencies / integrations:
  - Linear GraphQL labels connection.
  - Provider-worker issue-context consumers.
  - CLI JSON output consumers.

## Validation Plan
- Tests / checks:
  - focused `ProviderLinearWorkflowFacade.test.ts` live label parse assertion
  - focused cache write/read assertion proving labels survive snapshots
  - focused legacy omitted-label assertion proving omitted does not mean unlabeled
  - focused `LinearCliShell.test.ts` JSON output assertion
  - parent lane should run narrow focused tests first, then select broader docs/build/test gates before review handoff
- Rollout verification:
  - parent workpad records child-lane docs packet acceptance, source implementation, focused tests, full validation, review telemetry, PR attachment, and ready-review drain
- Monitoring / alerts:
  - no runtime monitor required; `linear issue-context --format json` and cache artifacts are the operator-visible proof surfaces

## Open Questions
- Exact label JSON shape is parent-owned, but it must preserve stable Linear label identity and display name.
- Parent should decide and test whether label ordering follows Linear response order or deterministic sorting.

## Approvals
- Reviewer: docs-review / standalone review pending
- Date: 2026-04-28
