# ACTION_PLAN - CO-557 provider docs-review task-key and control-host root drift

## Summary
- Goal: create the CO-557 docs-first packet and guide parent implementation toward explicit provider `docs-review` task-key authority and control-host artifact-root resolution.
- Scope: docs packet and registry mirrors in this child lane; parent-owned source inspection, implementation, focused tests, validation, Linear state, workpad, PR lifecycle, and review handoff.
- Assumptions:
  - the source payload pointer is absent in this child checkout, so the child packet uses the parent-provided handoff prompt and preserves the source anchor for parent reconciliation
  - parent implementation can stay narrow unless source inspection proves task-key/root authority is split across broader provider-worker lifecycle phases
  - parent validation may include a narrow docs/TASKS archive repair when a strict gate exposes recurring reserve headroom failure

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-515`
  - `CO-461`
  - `docs-review`
  - `delegation-guard`
  - `linear child-lane --action accept`
  - `linear child-stream --pipeline docs-review`
  - `linear-<uuid>-docs-packet`
  - `linear-<uuid>-source-freshness-recheck`
  - `tasks/index.json`
  - `provider-intake-state.json`
  - `shared control-host artifact root`
  - `workspace-local .runs`
  - `accepted child-lane manifest`
- Not done if:
  - docs-review task-key still resolves to `linear-<uuid>-docs-packet` or `linear-<uuid>-source-freshness-recheck`
  - docs-review child streams pass without registered parent task proof and sanctioned provider parent proof
  - `linear child-lane --action accept` can claim the wrong accepted child-lane manifest because artifact-root selection drifted
  - shared control-host artifact root and workspace-local `.runs` remain implicit or interchangeable
  - `provider-intake-state.json` is manually edited as the fix
  - `docs:check` is made green by weakening docs/TASKS reserve policy or deleting history instead of fixing archive eligibility
  - this child lane edits source, tests, Linear, workpad, GitHub, PR lifecycle, or undeclared files
- Pre-implementation issue-quality review:
  - 2026-05-25: packet carries both requested authority surfaces, exact protected terms, CO-515/CO-461 reference boundaries, wrong interpretations, explicit non-goals, Not Done If, parity matrix, and parent validation requirements.
- Fallback / refactor decision:
  - Applies: `Yes`, because task-key/root authority currently risks fallback-like implicit inference.
  - Decision: expire implicit docs-review task-key inference from sibling child keys and expire implicit artifact-root inference between shared control-host artifact root and workspace-local `.runs`.
  - Durable retention evidence: strict registered-parent-task and sanctioned-provider-child proof remain supported correctness contracts under `delegation-guard`.
- Large-refactor check:
  - Start with a scoped authority repair. Relaunch with widened ownership if parent source inspection shows root/task-key authority is split across lifecycle phases.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider docs-review task key | Docs-review task identity can be inferred from sibling child keys such as `linear-<uuid>-docs-packet` or `linear-<uuid>-source-freshness-recheck`. | expire fallback | CO-557 parent implementation | Provider docs-review launch or validation. | pre-CO-557 | 2026-05-25 | 2026-06-24 | Docs-review task key derives from registered parent task plus sanctioned child-stream proof. | Focused docs-review task-key and `delegation-guard` regressions. |
| Control-host artifact root | Artifact lookup can implicitly choose shared control-host artifact root or workspace-local `.runs`. | expire fallback | CO-557 parent implementation | Provider reads accepted child-lane manifest, source-freshness recheck, or provider-intake audit evidence. | pre-CO-557 | 2026-05-25 | 2026-06-24 | Root selection is explicit, diagnostics name the root, and wrong-root lookup fails closed. | Focused root-resolution and manifest-acceptance regressions. |
| Strict provider task registration and provenance | Contract name: registered parent task plus sanctioned provider child proof. | justify retaining fallback | Owning surface: `delegation-guard` and provider child-stream contract | Provider docs-review validation. | 2026-05-25 | 2026-05-25 | Non-expiring durable retention only with rationale | Non-expiring rationale: strict registry/provenance validation is correctness behavior. | Missing registry proof, wrong task key, and wrong-root artifact cases fail closed. |

## Milestones & Sequencing
1. Create the CO-557 docs-first packet and task mirrors within the declared docs child-lane scope.
2. Register the parent task in `tasks/index.json` and add docs freshness registry rows.
3. Parent runs docs-review before implementation.
4. Parent inspects provider docs-review task-key construction and child-stream manifest/guard surfaces.
5. Parent inspects `linear child-lane --action accept` accepted child-lane manifest lookup and control-host artifact root resolution.
6. Parent implements explicit task-key/root authority and fail-closed diagnostics.
7. Parent adds focused regressions for `linear-<uuid>-docs-packet`, `linear-<uuid>-source-freshness-recheck`, wrong-root lookup, registered parent proof, and `provider-intake-state.json` audit preservation.
8. If `docs:check` fails on docs/TASKS reserve headroom, parent fixes the root archive eligibility defect without changing the policy cap or deleting history.
9. Parent runs focused tests, then parent-selected repo validation/review gates before lifecycle handoff.

## Dependencies
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- `linear child-stream --pipeline docs-review`
- `linear child-lane --action accept`
- `delegation-guard`
- `provider-intake-state.json`
- shared control-host artifact root
- workspace-local `.runs`
- accepted child-lane manifest
- CO-515 source freshness reference behavior
- CO-461 provider docs-review child-stream guard reference behavior

## Validation
- Checks / tests:
  - child-lane protected-term scan over declared files
  - child-lane JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - child-lane trailing-whitespace and changed-file scope checks
  - parent-owned focused docs-review task-key tests
  - parent-owned focused `delegation-guard` tests for sanctioned and rejected docs-review child streams
  - parent-owned focused root-resolution tests for shared control-host artifact root versus workspace-local `.runs`
  - parent-owned accepted child-lane manifest lookup tests
  - parent-owned audit preservation check for `provider-intake-state.json`
  - parent-owned focused `tasks-archive` regression for `tasks/index.json` status `done`
  - parent-owned `docs:archive-tasks` run to restore configured docs/TASKS reserve
- Rollback plan:
  - revert only the task-key/root authority implementation if wrong task keys or wrong-root artifacts start passing; preserve this packet unless parent relaunches with widened scope.

## Risks & Mitigations
- Risk: docs-review accepts a sibling docs-packet task key.
  - Mitigation: add negative coverage for `linear-<uuid>-docs-packet`.
- Risk: source-freshness recheck artifacts become docs-review authority.
  - Mitigation: keep `linear-<uuid>-source-freshness-recheck` as separately classified CO-515 reference evidence.
- Risk: wrong-root artifact lookup silently succeeds.
  - Mitigation: require diagnostics to name selected root and fail closed when the accepted child-lane manifest is not under the authoritative root.
- Risk: fix weakens `delegation-guard`.
  - Mitigation: retain strict registered-parent-task and sanctioned-provider proof checks from CO-461.
- Risk: implementation hides evidence by editing provider intake.
  - Mitigation: preserve `provider-intake-state.json` as audit history and reject manual mutation as a fix.
- Risk: docs/TASKS reserve pressure recurs because `done` rows are terminal in task registry but invisible to archive eligibility.
  - Mitigation: normalize `done` as terminal in `scripts/tasks-archive.mjs`, prove it with `tests/tasks-archive.spec.ts`, and restore reserve with `docs:archive-tasks`.

## Approvals
- Reviewer: bounded same-issue docs child lane for packet readiness; parent manifest-backed review found P1 accepted child-lane root authority gap, rework is complete, deterministic validation reran green, and model-backed review rerun is pending.
- Date: 2026-05-25
