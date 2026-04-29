# PRD - CO-400 provider issue current-state authority and issue-context label projection

## Traceability
- Linear issue: `CO-400` / `6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3`
- Task id: `linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3`
- Canonical spec: `tasks/specs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- Task checklist: `tasks/tasks-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- Source anchor: `ctx:sha256:f92e935a0e7a99898f24e320414e1c8a7cc9bc966dbf796b8c606abad73b6446#chunk:c000001`

## Summary
- Problem Statement: `codex-orchestrator linear issue-context` is the provider-worker current-state authority for Linear issues, but the current live query and model omit Linear issue labels. Provider workers therefore cannot distinguish "labels were not projected" from "the issue is unlabeled", and cached snapshots can strip labels even after live state contained them.
- Desired Outcome: Linear labels are treated as live issue current-state data. The GraphQL issue-context query, `ProviderLinearIssueContext`, live parsing, cached parse/write helpers, issue summary projection, CLI JSON output, and focused tests all preserve labels without fallback projection.

## User Request Translation
- User intent / needs: Make CO-400 consolidate the label portion of provider issue current-state authority so labels flow end to end through `linear issue-context` rather than being inferred, omitted, or reconstructed from stale state.
- Success criteria / acceptance:
  - `buildIssueContextQuery` requests Linear issue label nodes for `linear issue-context`.
  - `ProviderLinearIssueContext` carries label data from live GraphQL responses.
  - `parseIssueContext`, `parseCachedIssueContext`, `writeCachedIssueContextRecord`, and cache records preserve labels without stripping them.
  - `summarizeIssueContext` and CLI JSON output expose labels when the live or cached issue context contains them.
  - Provider-worker logic never infers an issue is unlabeled only because an older helper surface omitted `labels`.
  - Focused coverage in `ProviderLinearWorkflowFacade.test.ts` and `LinearCliShell.test.ts` proves live projection, cache round-trip, CLI JSON output, and omission safety.
- Constraints / non-goals:
  - Do not rework CO-398 control-host status fallback decisions.
  - Do not weaken expected-state checks or provider-worker fail-closed behavior.
  - Do not hide Linear/provider disagreement behind fallback projection.
  - Do not add source or test edits in this docs-packet child lane.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `issue-context label projection`
  - `live Linear issue current-state`
  - `cached snapshots preserve labels`
  - `no fallback projection`
  - `provider workers must not infer unlabeled from omitted labels`
  - `GraphQL`
  - `ProviderLinearIssueContext`
  - `live parsing`
  - `cached parse/write`
  - `CLI JSON output`
  - `focused tests`
- Protected artifact and surface names:
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
  - treating labels as display-only metadata outside current-state authority
  - synthesizing labels from cached provider state, provider-worker labels, or fallback projection
  - treating omitted `labels` from an old cache/helper as a positive `unlabeled` state
  - updating only the live GraphQL query while cache parse/write or CLI JSON still drops labels
  - broadening into CO-398 control-host status fallback work
  - weakening expected-state checks to avoid reconciling Linear/provider disagreement

## Label Projection Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `buildIssueContextQuery` | The live issue-context query requests issue metadata, state, team, project, comments, and attachments, but not labels. | Labels are part of live Linear issue current-state. | The query requests label nodes with stable identity/name metadata needed by provider-worker current-state consumers. | Querying unrelated Linear metadata or status fallback fields. |
| `ProviderLinearIssueContext` / live parse | The issue context model has no label field, so live labels cannot be represented. | Live parse should preserve the labels returned by Linear. | Parsed issue context carries labels in a deterministic JSON-safe shape. | Reworking unrelated issue-context fields. |
| Cache parse/write | Cached issue-context snapshots can round-trip without labels because labels are absent from the cache record shape. | Cache is a snapshot of current-state truth and must not erase labels once known. | Cache records preserve labels; older cache records with omitted labels remain `unknown/not projected`, not `unlabeled`. | Fallback projection from provider-worker state. |
| CLI JSON / summaries | `linear issue-context --format json` and issue summaries can omit labels. | Machine consumers need labels when they are known. | JSON output includes labels from live or cached context and never reports unlabeled solely from omission. | CLI formatting redesign unrelated to issue-context JSON. |
| Focused tests | Existing tests do not pin label projection through live, cache, and CLI paths. | Current-state authority changes require targeted regressions. | Facade and CLI tests fail if labels are missing, stripped, or inferred incorrectly. | Full repo validation from this child lane. |

## Not Done If
- `linear issue-context --format json` still omits known Linear issue labels.
- Cached issue-context snapshots strip labels after a live read.
- Provider workers can infer `unlabeled` from an omitted `labels` property.
- The implementation adds fallback label projection instead of carrying live Linear labels.
- Only one of live query, cache parse/write, summary, or CLI JSON output is updated.
- CO-398 control-host fallback decisions or expected-state checks are changed to hide disagreement.

## Goals
- Treat labels as first-class live Linear issue current-state in the provider workflow facade.
- Preserve labels across live query parsing, cached parse/write, issue summaries, and CLI JSON output.
- Keep omission safety explicit: missing `labels` means not projected or unknown unless the live Linear response proves an empty label set.
- Add focused facade and CLI tests for label projection and cache round-trip behavior.

## Non-Goals
- No CO-398 control-host status fallback rework.
- No weakening expected-state checks, provider admission checks, or provider-worker fail-closed behavior.
- No fallback projection from stale provider state, cached worker metadata, or local labels.
- No Linear state, workpad, source implementation, test implementation, PR, or merge lifecycle work in this child lane.

## Stakeholders
- Product: CO operators relying on `linear issue-context` for provider-worker current-state truth.
- Engineering: provider workflow facade, Linear CLI, provider-worker, and review/test owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - focused facade tests prove live label parsing and cache round-trip preservation
  - focused CLI tests prove JSON output includes labels and omission is not treated as unlabeled
  - implementation diff stays limited to issue-context authority surfaces and focused tests
- Guardrails / Error Budgets:
  - zero fallback label projection paths
  - zero expected-state weakening
  - zero unrelated CO-398 fallback changes
  - zero source/test edits from this docs-only child lane

## Technical Considerations
- Architectural Notes:
  - Prefer one label record shape shared by live parse, cache parse/write, summaries, and JSON output.
  - Preserve backward compatibility for older cached snapshots by treating missing `labels` as unknown/not projected.
  - If the live Linear response returns an explicit empty label node list, that may be represented as known empty labels.
- Dependencies / Integrations:
  - Linear GraphQL issue label connection.
  - `providerLinearWorkflowFacade.ts` issue-context cache file format.
  - `codex-orchestrator linear issue-context --format json`.
  - Focused facade and CLI test fixtures.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Live issue-context projection | Labels omitted from the live current-state GraphQL projection. | remove fallback | CO-400 | Provider worker reads issue context for current Linear truth. | existing issue-context behavior | N/A after removal | N/A after removal | Label nodes are part of the live issue-context query. | Focused facade test asserts live label nodes parse into issue context. |
| Cached issue-context snapshots | Cached parse/write can strip labels or make omitted labels look authoritative. | remove fallback | CO-400 | Issue-context cache is read or written after label-aware live context exists. | existing cache behavior | N/A after removal | N/A after removal | Cache records preserve labels; missing legacy `labels` remains unknown/not projected. | Cache round-trip regression plus legacy omitted-label safety assertion. |
| Provider-worker label state | Local/provider fallback projection or omitted-label inference substitutes for live Linear labels. | remove fallback | CO-400 | Provider worker or CLI consumer needs label state. | existing omission behavior | N/A after removal | N/A after removal | Consumers use live/cached label projection only, and omission cannot become `unlabeled`. | CLI JSON regression and provider-facing facade assertion. |

- Durable retention evidence: No retained temporary fallback is approved by this packet. Cache remains a supported current-state snapshot contract only when it preserves known labels and represents omitted legacy labels as unknown/not projected.
- Large-refactor check: CO-400 is the current-state authority consolidation lane for this label surface. The parent should keep the implementation narrow to issue-context labels unless source inspection proves labels are entangled with a broader authority split; CO-398 status fallback decisions remain out of scope.

## Open Questions
- Parent implementation should choose the exact label JSON shape, but it must include stable Linear label identity and display name fields.
- Parent implementation should decide whether label ordering follows Linear order or a deterministic sort, then pin the choice in tests.

## Approvals
- Product: Linear CO-400, pending
- Engineering: docs-review / implementation review, pending
- Design: N/A
