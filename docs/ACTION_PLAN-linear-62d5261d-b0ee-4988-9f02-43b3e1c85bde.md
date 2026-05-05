# ACTION_PLAN - CO-434 oversized docs-freshness canonical owner reuse

## Summary
- Goal: prevent duplicate canonical owner creation for CO-434's oversized docs-freshness owner key.
- Scope: exact canonical owner marker parsing, focused regression coverage, docs-first packet/mirrors, and validation evidence.
- Assumptions:
  - CO-434 remains live and non-terminal while same-key owner reuse is validated.
  - Current `docs:freshness:maintain` output is clean and does not require historical packet edits.
  - The canonical owner marker line is the durable owner stamp; both `-` and `*` are valid Markdown bullet forms only when the marker text matches exactly.

## Issue Readiness Gate
- Intent checksum / protected terms: `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `stale active-spec routing`, the oversized hashed key, tasks/tasks-2001-historical.md, and `CO-175`.
- Not done if a repeated same-key follow-up can create a duplicate owner, if prefix-only markers are accepted, or if the repair weakens docs/spec freshness gates.
- Pre-implementation issue-quality review: 2026-05-05 parent provider worker classified this as a narrow exact-marker duplicate-prevention repair, not a stale-doc refresh.
- Fallback / refactor decision: touches a compatibility parsing seam. Decision is `justify retaining fallback` for Markdown bullet form compatibility; owner CO-434; trigger generated canonical owner descriptions may use `-` or `*`; introduced/reviewed 2026-05-05; non-expiring supported contract until a structured marker schema replaces Markdown parsing; validation by focused facade regression.
- Durable retention evidence: contract name `canonical-owner-description-marker-line`; owning surface `providerLinearWorkflowFacade`; steady-state proof is exact marker comparison and prefix-only tests; rationale is that Markdown list marker choice is presentation, while owner identity remains exact marker text.
- Large-refactor check: no larger refactor is preferred because the helper already has exact marker identity, pagination, terminal filtering, and same-project filtering; a schema migration would be broader than the issue.

## Milestones & Sequencing
1. Confirm live Linear context and move CO-434 to `In Progress`.
2. Record the required same-issue parallelization decision and classify current maintenance output.
3. Add docs-first packet, task mirrors, and freshness registry entries.
4. Patch exact marker detection to accept asterisk-bulleted marker lines.
5. Add focused oversized-key regression coverage.
6. Run focused and repo validation, standalone review, elegance review, PR handoff, and ready-review drain.

## Dependencies
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `docs:freshness:maintain` owner/action evidence
- Linear issue CO-434's exact canonical owner marker

## Validation
- Checks / tests: focused facade test, `docs:freshness:maintain`, docs/spec gates, build/lint/test, docs checks, repo stewardship, diff budget, standalone review, elegance review, PR checks, and ready-review drain.
- Rollback plan: revert the marker-line parser and regression if the exact matching contract expands beyond list-marker normalization or creates duplicate reuse ambiguity.

## Risks & Mitigations
- Risk: accepting `*` becomes fuzzy matching. Mitigation: compare full normalized marker line against a finite set of exact strings.
- Risk: duplicate owner creation remains possible through terminal/out-of-project owners. Mitigation: leave existing non-terminal and same-project filters unchanged.
- Risk: docs freshness work widens into historical packet cleanup. Mitigation: keep `docs:freshness:maintain` clean evidence separate from the code repair.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-05-05.
