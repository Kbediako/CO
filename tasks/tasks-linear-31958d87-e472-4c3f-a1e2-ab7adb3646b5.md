# Task Checklist - linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5

- Linear Issue: `CO-538` / `31958d87-e472-4c3f-a1e2-ab7adb3646b5`
- Task registry id: `20260514-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5`
- MCP Task ID: `linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5`
- Primary PRD: `docs/PRD-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- TECH_SPEC: `tasks/specs/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- Source anchor: `ctx:sha256:0b7864e23887d0b023799ab19858917af9f490c4a4e62af57b5913aebe5861dc#chunk:c000001`
- Child lane manifest: `.runs/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5-docs-packet-local/cli/2026-05-14T03-58-04-115Z-a02ced60/manifest.json`
- Child lane limitation: referenced source payload path was absent in this checkout; packet uses the embedded parent prompt.

## Docs-First
- [x] Same-issue docs child lane drafted the docs-first packet and mirrors inside the declared file scope. Evidence: this patch.
- [x] PRD created with issue description, acceptance criteria, intent checksum, non-goals, `Not Done If`, live verification contract, and fallback decision. Evidence: `docs/PRD-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`.
- [x] TECH_SPEC created with bounded live post-mutation label verification contract and validation plan. Evidence: `tasks/specs/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`, `docs/TECH_SPEC-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`.
- [x] ACTION_PLAN created for parent implementation sequencing. Evidence: `docs/ACTION_PLAN-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`.
- [x] Task registration updated in canonical `tasks/index.json`. Evidence: CO-538 entry in `tasks/index.json`.
- [x] Docs freshness registry rows added for packet files. Evidence: CO-538 rows in `docs/docs-freshness-registry.json`.

## Acceptance Criteria
- [ ] Tests cover create success where terminal live labels are missing or `labels: []`. Parent implementation evidence pending.
- [ ] Post-create live read verifies terminal follow-up labels before clean success. Parent implementation evidence pending.
- [ ] Post-reuse live read verifies terminal follow-up labels before clean success. Parent implementation evidence pending.
- [ ] Missing expected source-derived labels trigger one bounded `addedLabelIds` repair. Parent implementation evidence pending.
- [ ] Repair path performs a final live reread before clean success. Parent implementation evidence pending.
- [ ] Persistent missing labels fail closed with follow-up issue id or identifier, expected labels, observed labels, and missing labels. Parent implementation evidence pending.
- [ ] JSON terminal output exposes terminal live labels. Parent implementation evidence pending.
- [ ] Human terminal output exposes terminal live labels. Parent implementation evidence pending.
- [ ] Tests cover propagation delay, reuse repair, persistent missing labels, and operator output. Parent implementation evidence pending.
- [ ] Existing CO-482 source-derived label assignment remains intact. Parent implementation evidence pending.

## Protected Issue Terms
- [x] `codex-orchestrator linear create-follow-up`
- [x] `CO-482`
- [x] `CO-537`
- [x] `labels: []`
- [x] `labelIds`
- [x] `addedLabelIds`
- [x] `live linear issue-context`
- [x] `post-create live verification`
- [x] `canonical owner reuse`
- [x] `source-derived labels`
- [x] `fail closed`

## Non-Goals / Not Done If
- [x] No Linear label taxonomy changes. Evidence: docs packet scope.
- [x] No CO-400 projection semantics changes. Evidence: docs packet scope.
- [x] No provider admission or queue prioritization changes. Evidence: docs packet scope.
- [x] No manual labeling sweep. Evidence: docs packet scope.
- [x] No cached or mutation-return labels as clean-success authority. Evidence: docs packet readiness gate.
- [x] Not done if terminal live labels can remain `labels: []` or missing expected source-derived labels after clean success. Evidence: PRD and TECH_SPEC `Not Done If`.
- [x] Not done if persistent missing labels lack issue id or identifier plus expected, observed, and missing label evidence. Evidence: PRD and TECH_SPEC validation plan.

## Fallback Decision Table
- Large-refactor decision: not required; this is a bounded verification-and-repair extension to the existing `create-follow-up` helper.
- Minor-seam decision: acceptable because the task removes mutation-return/cached labels as terminal authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Follow-up live label proof | Mutation-return or cached labels can be treated as terminal label authority. | `remove fallback` | CO-538 | `create-follow-up` creates or reuses a follow-up issue. | Existing pre-CO-538 behavior | 2026-05-14 | This issue | Clean success requires live post-mutation issue labels matching expected source-derived labels. | Focused create/reuse/repair/failure/output tests. |

- Contract name: `create-follow-up` live post-mutation label verification.
- Owning surface: provider Linear workflow facade and CLI shell.
- Steady-state proof: parent implementation must provide focused tests for live reads, repair, fail-closed evidence, and terminal output.
- Tests/docs: `ProviderLinearWorkflowFacade.test.ts`, CLI output assertions, and this CO-538 docs packet.
- Non-expiring rationale: live issue state is the durable authority for label verification.
- Adjacent owner note: CO-482 source-derived label assignment remains intact; CO-400 projection semantics remain out of scope.

## Implementation
- [ ] Inspect CO-482 label resolution and current `create-follow-up` facade behavior. Parent implementation evidence pending.
- [ ] Add or reuse a live target issue read path equivalent to `live linear issue-context`. Parent implementation evidence pending.
- [ ] Verify labels live after create. Parent implementation evidence pending.
- [ ] Verify labels live after canonical owner reuse. Parent implementation evidence pending.
- [ ] Add bounded `addedLabelIds` repair and final live reread. Parent implementation evidence pending.
- [ ] Add fail-closed partial failure evidence. Parent implementation evidence pending.
- [ ] Ensure JSON and human output cite terminal live labels. Parent implementation evidence pending.
- [ ] Preserve CO-482, CO-400, label taxonomy, provider admission, and queue boundaries. Parent implementation evidence pending.

## Validation
- [ ] Focused create success with live missing labels test. Parent implementation evidence pending.
- [ ] Focused post-create live read test. Parent implementation evidence pending.
- [ ] Focused post-reuse live read test. Parent implementation evidence pending.
- [ ] Focused bounded `addedLabelIds` repair test. Parent implementation evidence pending.
- [ ] Focused propagation delay test. Parent implementation evidence pending.
- [ ] Focused persistent missing labels partial failure test. Parent implementation evidence pending.
- [ ] Focused JSON/human output tests for terminal live labels. Parent implementation evidence pending.
- [ ] Parent-required build/lint/test/docs/review gates. Parent implementation evidence pending.
- [x] Child-lane JSON parse and file presence checks. Evidence: local docs-packet validation.
- [x] Child-lane `git diff --check`. Evidence: local docs-packet validation.

## Progress Log
- 2026-05-14: Docs-only child lane drafted PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json` entry, `docs/TASKS.md` snapshot, and docs freshness registry rows inside declared file scope.
- 2026-05-14: Source payload path from parent prompt was absent in this child checkout; packet preserved the source anchor and used parent prompt plus local packet patterns.
- 2026-05-14: Scope kept narrow to post-mutation live label verification for `create-follow-up` and explicitly excludes Linear label taxonomy, CO-400 projection semantics, provider admission, queue prioritization, manual label sweeps, and cached/mutation-return labels as authority.

## Notes
- Parent owns Linear state, workpad, PR lifecycle, implementation, full validation, and review handoff.
- Child lane must leave changes uncommitted for patch export.
