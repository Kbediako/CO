# Task Checklist - CO-515 control-host source freshness recheck after main advances

- Linear Issue: `CO-515` / `5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- Task registry id: `20260518-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- MCP Task ID: `linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- Primary PRD: `docs/PRD-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- TECH_SPEC: `tasks/specs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- Canonical owner key: `control-host:source-freshness-recheck-after-main-advance`
- Shared source anchor: `ctx:sha256:e50fbc86099d15a7bd5e45c23028430bd6de7f985de2237cb5ea66b7673567f2#chunk:c000001`
- Child manifest: `.runs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e-docs-packet/cli/2026-05-18T23-15-56-334Z-bed38666/manifest.json`
- Source payload note: source payload was absent under this child checkout's own `.runs` tree and was read read-only from the parent-relative source path; it contained run/issue provenance only, so this packet preserves the parent-provided issue wording.

## Docs-First
- [x] PRD created with user-request translation, intent checksum, parity matrix, non-goals, Not Done If, and fallback/refactor decision. Evidence: `docs/PRD-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`.
- [x] Canonical TECH_SPEC created under `tasks/specs/` with issue-shaping contract, readiness gate, technical requirements, and validation plan. Evidence: `tasks/specs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`.
- [x] TECH_SPEC mirror created under `docs/`. Evidence: `docs/TECH_SPEC-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`.
- [x] ACTION_PLAN created with sequencing, dependencies, validation, and risk controls. Evidence: `docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`.
- [x] Task checklist created. Evidence: `tasks/tasks-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] Task snapshot updated. Evidence: `docs/TASKS.md`.
- [x] Docs freshness registry updated for declared packet/checklist files. Evidence: `docs/docs-freshness-registry.json`.
- [x] `.agent/task` mirror intentionally not created because it is outside this child lane's declared file scope. Evidence: user-provided file scope.

## Protected Issue Terms
- [x] `control-host source freshness`
- [x] `origin/main`
- [x] `observed_at`
- [x] `source_checkout.head`
- [x] stale current status
- [x] long-running control-host
- [x] shared-root posture
- [x] resident supervised control-host
- [x] `provider-intake-state.json`
- [x] `co-status --format json`
- [x] `control-host:source-freshness-recheck-after-main-advance`
- [x] CO-555 recurrence fixture
- [x] CO-556 dependent policy

## Wrong Interpretations Rejected
- [x] hand-editing `provider-intake-state.json`
- [x] restarting the host as the fix
- [x] hiding source freshness evidence
- [x] using shared-root posture as proof of resident supervised source freshness
- [x] changing provider-worker issue selection, WIP caps, or Linear lifecycle authority
- [x] implementing CO-556 auto-restart/fail-closed policy inside CO-515

## Acceptance Criteria
- [ ] Parent implementation rechecks resident supervised control-host source freshness after local `origin/main` advances.
- [ ] `co-status --format json` and `/ui/data.json` stop reporting stale current status after `origin/main` advances beyond `source_checkout.head`.
- [ ] `observed_at` names the latest freshness comparison time rather than stale startup/persisted owner time.
- [ ] `source_checkout.head`, upstream, and behind/ahead data reflect the supervised source root comparison.
- [ ] Shared-root posture remains separate from supervised source-root freshness.
- [ ] No manual `provider-intake-state.json` edits are required or recommended.
- [ ] CO-555 recurrence fixture proves stale current status is reclassified after main advances.
- [ ] CO-556 remains the owner for auto-restart/fail-closed policy after stale-source detection is trustworthy.

## Validation
- [x] Child scoped source anchor read. Evidence: parent-relative `source-0/source.txt` read contained run and issue provenance for CO-515.
- [x] Child scoped JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json ok')"`.
- [x] Child scoped JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('docs/docs-freshness-registry.json ok')"`.
- [x] Child scoped protected-term check over declared CO-515 files. Evidence: `rg -n "control-host source freshness|origin/main|observed_at|source_checkout\\.head|stale current status|long-running control-host|shared-root posture|resident supervised control-host|provider-intake-state\\.json|co-status --format json|control-host:source-freshness-recheck-after-main-advance|CO-555 recurrence fixture|CO-556 dependent policy" <declared CO-515 files>`.
- [x] Child scoped whitespace / diff check on declared touched files. Evidence: `git diff --check -- <declared CO-515 files plus tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json>`.
- [ ] Parent docs-review before implementation.
- [ ] Parent focused source freshness recheck tests.
- [ ] Parent CO-555 recurrence fixture.
- [ ] Parent `co-status --format json` or `/ui/data.json` projection assertion.
- [ ] Parent implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff.

## Fallback Metadata
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove cached-current source freshness after local `origin/main` advances.
- Large-refactor check: keep this scoped to trustworthy stale-source detection/projection; CO-556 owns policy response after detection is reliable.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host source freshness projection | Cached or startup-time freshness can keep stale current status after `origin/main` advances. | remove fallback | CO-515 | Long-running resident supervised control-host source root is behind local `origin/main` while status/proof surfaces still say current. | Observed 2026-05-18 | 2026-05-18 | This issue | Source freshness rechecks local `origin/main` before reporting current and emits stale/warning with updated `observed_at` and `source_checkout.head` when behind. | CO-555 recurrence fixture plus focused source freshness/status projection tests. |

## Progress Log
- 2026-05-18: Bounded same-issue docs child lane created the CO-515 docs-first packet and task registration from the parent-provided issue contract. Scope stayed docs-only; no implementation, tests, Linear mutation, GitHub mutation, workpad mutation, or full repo validation was run.
- 2026-05-18: Child scoped validation passed for JSON parsing, protected-term coverage, and `git diff --check` over the declared files. Parent implementation, docs-review, and review handoff remain pending.

## Notes
- Parent owns authoritative issue workspace, Linear state, workpad, implementation, tests, PR lifecycle, and review handoff.
- This child lane leaves changes uncommitted for parent patch export.
