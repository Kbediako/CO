# ACTION_PLAN - CO-400 provider issue current-state authority and issue-context label projection

## Summary
- Goal: make Linear issue labels part of `linear issue-context` current-state authority from GraphQL through CLI JSON and cache.
- Scope: docs-first packet, provider workflow facade issue-context label projection, cache preservation, CLI JSON output, and focused facade/CLI regressions.
- Assumptions: parent lane owns implementation, tests, Linear state, workpad, PR lifecycle, review, and broad validation; this child lane owns only the docs packet.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `issue-context label projection`
  - `live Linear issue current-state`
  - `cached snapshots preserve labels`
  - `no fallback projection`
  - `provider workers must not infer unlabeled from omitted labels`
  - `GraphQL`, `ProviderLinearIssueContext`, `live parsing`, `cached parse/write`, `CLI JSON output`, `focused tests`
- Not done if:
  - labels still do not appear in `linear issue-context --format json`
  - cache read/write strips labels
  - omitted labels are treated as authoritative `unlabeled`
  - fallback projection supplies labels
  - CO-398 fallback decisions or expected-state checks change
- Pre-implementation issue-quality review:
  - 2026-04-28: issue scope is label current-state authority, not display-only output and not CO-398 fallback work.
  - 2026-04-28: docs packet preserves all required surfaces from the parent prompt: GraphQL, `ProviderLinearIssueContext`, live parse, cached parse/write, CLI JSON, and focused tests.
- Fallback / refactor decision:
  - Applies: `Yes`, because the issue touches cached snapshots and explicitly rejects fallback projection.
  - Decision: remove label omission and omitted-label inference; no retained temporary fallback is approved.
- Durable retention evidence:
  - Not applicable. Cache remains a supported snapshot contract only when known labels are preserved and legacy omitted labels are treated conservatively.
- Large-refactor check:
  - CO-400 is the label current-state authority lane. Keep implementation narrow unless source inspection proves labels require a broader current-state consolidation. Do not absorb CO-398 status fallback decisions.

## Milestones & Sequencing
1. Register docs-first packet and mirrors.
2. Extend `buildIssueContextQuery` to request label nodes.
3. Add label shape to `ProviderLinearIssueContext` and live parse helpers.
4. Preserve labels through `parseCachedIssueContext`, cache record validation, and `writeCachedIssueContextRecord`.
5. Thread labels into `summarizeIssueContext` and CLI JSON output.
6. Add focused `ProviderLinearWorkflowFacade.test.ts` coverage for live parse, cache round-trip, and omitted-label safety.
7. Add focused `LinearCliShell.test.ts` coverage for `linear issue-context --format json` label output.
8. Run parent-selected focused tests first, then normal parent validation/review gates before PR handoff.

## Dependencies
- Linear GraphQL label connection.
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`.
- Existing issue-context cache records.
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- `orchestrator/tests/LinearCliShell.test.ts`.

## Validation
- Checks / tests:
  - focused facade live-parse regression
  - focused cache round-trip regression
  - focused omitted-label safety regression
  - focused CLI JSON regression
  - parent-owned `node scripts/delegation-guard.mjs`
  - parent-owned `node scripts/spec-guard.mjs --dry-run`
  - parent-owned build/lint/test/docs/review gates selected after implementation
- Rollback plan:
  - Revert the label projection changes if they weaken expected-state checks, create fallback label projection, or make older cache records unreadable. Preserve the docs packet as issue traceability unless parent decides to relaunch with widened scope.

## Risks & Mitigations
- Risk: implementation treats omitted legacy labels as known empty labels.
  - Mitigation: add an omitted-label safety regression and document the chosen unknown/not-projected behavior.
- Risk: only the live query changes while cache or CLI JSON still strips labels.
  - Mitigation: acceptance requires live, cache, summary, and CLI JSON coverage.
- Risk: lane drifts into CO-398 status fallback or expected-state checks.
  - Mitigation: keep those surfaces explicit non-goals and stop for parent relaunch if they become necessary.

## Approvals
- Reviewer: parent lane / docs-review pending
- Date: 2026-04-28
