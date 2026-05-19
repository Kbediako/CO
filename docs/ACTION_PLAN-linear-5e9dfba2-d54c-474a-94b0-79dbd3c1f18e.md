# ACTION_PLAN - CO-515 control-host source freshness recheck after main advances

## Summary
- Goal: make `control-host source freshness` recheck local `origin/main` after main advances so a resident supervised control-host cannot keep stale current status in `co-status --format json`.
- Scope: docs packet, parent implementation contract, source freshness recheck/projection behavior, CO-555 recurrence fixture, and registration metadata.
- Assumptions:
  - CO-515 owns trustworthy stale-source detection only.
  - CO-556 owns later auto-restart/fail-closed policy once stale-source detection is reliable.
  - Status/proof reads compare against local refs and remain no-fetch/no-mutation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `control-host source freshness`
  - `origin/main`
  - `observed_at`
  - `source_checkout.head`
  - stale current status
  - long-running control-host
  - shared-root posture
  - resident supervised control-host
  - `provider-intake-state.json`
  - `co-status --format json`
  - `control-host:source-freshness-recheck-after-main-advance`
  - CO-555 recurrence fixture
  - CO-556 dependent policy
- Not done if:
  - `co-status --format json` still reports stale current status after `origin/main` advances
  - `observed_at` or `source_checkout.head` is stale while the verdict says current
  - shared-root posture is treated as proof of resident supervised source freshness
  - the fix depends on manual `provider-intake-state.json` edits, host restart, hidden source evidence, WIP cap changes, or Linear lifecycle changes
- Pre-implementation issue-quality review:
  - 2026-05-18: docs child lane kept the issue as stale-source detection after main advances. This is narrower than restart/fail-closed policy and more specific than the earlier CO-458 provenance packet because it requires a recheck when `origin/main` moves.
- Fallback / refactor decision:
  - This task touches stale/cached status behavior. Decision: `remove fallback` for cached-current source freshness after local `origin/main` advances.
- Durable retention evidence:
  - Not applicable. CO-515 retains no stale-current fallback. `provider-intake-state.json` remains separate operational evidence, not a retained source freshness fallback.
- Large-refactor check:
  - Keep this scoped to source freshness recheck/projection unless parent source inspection shows duplicated freshness refresh paths that must be consolidated to make detection trustworthy.

## Fallback Metadata

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host source freshness projection | Cached or startup-time freshness can keep stale current status after `origin/main` advances. | remove fallback | CO-515 | Long-running resident supervised control-host source root is behind local `origin/main` while status/proof surfaces still say current. | Observed 2026-05-18 | 2026-05-18 | This issue | Source freshness rechecks local `origin/main` before reporting current and emits stale/warning with updated `observed_at` and `source_checkout.head` when behind. | CO-555 recurrence fixture plus focused source freshness/status projection tests. |

## Milestones & Sequencing
1. Register the CO-515 docs packet in the declared files: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Parent inspects source freshness recheck/projection paths that feed control-host ownership, polling payloads, `/ui/data.json`, and `co-status --format json`.
3. Parent defines where the resident supervised control-host source freshness is rechecked after local `origin/main` advances.
4. Parent ensures `observed_at`, `source_checkout.head`, upstream, and behind/ahead fields correspond to the latest comparison before projecting current.
5. Parent keeps shared-root posture and `provider-intake-state.json` evidence separate from source freshness verdicts.
6. Parent adds CO-555 recurrence fixture and focused current/stale/no-remote freshness projection tests.
7. Parent runs docs-review, focused implementation validation, implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff.
8. CO-556 can then implement auto-restart/fail-closed policy against trustworthy stale-source detection.

## Dependencies
- Local Git refs, especially `origin/main`
- `orchestrator/src/cli/utils/sourceRootFreshness.ts`
- Control-host owner/polling projection
- `/ui/data.json`
- `co-status --format json`
- `provider-intake-state.json`
- CO-555 recurrence fixture
- CO-556 dependent policy

## Validation
- Child lane:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - protected-term scan over declared CO-515 packet and registration files
  - `git diff --check` over declared touched paths
- Parent lane:
  - focused source freshness recheck tests
  - CO-555 recurrence fixture after local `origin/main` advances
  - focused `co-status --format json` or `/ui/data.json` projection assertion
  - no-fetch/no-mutation proof for status/proof read path
  - implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff

## Risks & Mitigations
- Risk: parent treats CO-515 as solved by restarting the resident host.
  - Mitigation: acceptance requires stale-source detection to be trustworthy before CO-556 policy acts on it.
- Risk: parent infers freshness from the shared root instead of the supervised source root.
  - Mitigation: acceptance requires `source_checkout.head` and `observed_at` for the resident supervised source root.
- Risk: status reads mutate Git refs or provider-intake state.
  - Mitigation: status/proof comparison must be read-only against local refs and must not edit `provider-intake-state.json`.
- Risk: source evidence is hidden to avoid operator noise.
  - Mitigation: `co-status --format json` must preserve explicit source freshness evidence.

## Approvals
- Reviewer: CO-515 provider worker / parent lane.
- Date: 2026-05-18.
