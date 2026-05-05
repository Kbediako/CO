# ACTION_PLAN - CO-457 provider-worker resolved model provenance

## Summary
- Goal: create the CO-457 docs-first packet and traceability mirrors so resolved model provenance work can leave Backlog with model-posture guardrails intact.
- Scope: packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - local ChatGPT-auth/appserver posture remains `gpt-5.5` / `xhigh` when available
  - portable fallback posture remains `gpt-5.4` / `xhigh`
  - provider-worker launch can continue when runtime model evidence is missing if degraded proof is truthful

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `gpt-5.5`
  - `gpt-5.4`
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-session-log-hydration.json`
  - `codex exec --json`
  - `codex exec resume --json`
  - `--model`
  - `model_reasoning_effort`
  - resolved model provenance
  - `CO STATUS`
  - read-model
- Not done if:
  - artifacts still require manual inference from `~/.codex/config.toml`
  - proof reports a model without source/confidence
  - CO STATUS or read-model hides missing provenance as authoritative
  - the lane changes current model defaults
  - binary/auth provenance work is absorbed from `CO-450` or `CO-451`
- Pre-implementation issue-quality review:
  - 2026-05-03: CO-457 is a provenance visibility lane, not a model-default migration lane.
  - 2026-05-03: the micro-task path is unavailable because correctness depends on exact protected surfaces, fallback posture, and degraded evidence semantics.
  - 2026-05-03: packet setup must happen before the issue leaves Backlog.
- Linear parallelization decision: `stay_serial_packet_only` until packet and registry mirrors are present; parent implementation can later parallelize focused source inspection and status/read-model tests.
- Fallback / refactor decision: expire the narrow degraded-provenance fallback when runtime model metadata is missing; fail truthful rather than blocking launch or pretending certainty.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker resolved model provenance | Degraded proof path for missing runtime model or effort metadata | expire fallback | CO-457 | Codex JSONL omits runtime model metadata from provider-worker `codex exec --json` or resume output | 2026-05-05 | 2026-05-19 | 2026-06-04 | Codex runtime always emits authoritative model/reasoning metadata for provider-worker runs, or CO adopts a stronger proof source | Focused runtime-reported, inherited-config, command override, unknown/degraded, hydration, and read-model projection tests |

- Large refactor decision: no large refactor is justified; this remains a narrow proof/hydration/status projection extension under existing provider-worker authority.
- Minor seam decision: the temporary degraded-provenance seam is acceptable only with source, confidence, degraded reason, expiry metadata, and focused validation.

## Milestones & Sequencing
1. Read nearby provider-worker traceability packet patterns.
2. Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror for CO-457.
3. Register the CO-457 task in `tasks/index.json`.
4. Add a top `docs/TASKS.md` snapshot.
5. Add six active rows to `docs/docs-freshness-registry.json`.
6. Record that the packet clears `backlog_head_follow_up_traceability_pending`.
7. Run scoped packet validation: JSON parse, path scan, protected-term scan, spec guard, docs checks where feasible.
8. Re-check control-host queue state and keep provider intake under the active issue cap.
9. Parent implementation follow-up adds proof/hydration/status/read-model code and focused provenance tests.

## Dependencies
- Linear issue `CO-457` / `7b8e48c8-3971-42ab-b779-949d810d4e6c`.
- Source issue `CO-352` / `f4469614-cfdf-49a6-a7ff-366f58229816`.
- Related boundary issue `CO-450` for binary provenance.
- Related boundary issue `CO-451` for auth provenance.
- Provider-worker proof writer, session hydration, CO STATUS, and read-model surfaces.

## Validation
- Checks / tests:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - targeted path scan for `linear-7b8e48c8-3971-42ab-b779-949d810d4e6c` and `CO-457`
  - targeted protected-term scan for model/proof/read-model terms
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - record quota state if model-backed standalone review remains unavailable
  - focused proof/hydration/status/read-model tests after implementation begins
- Rollback plan:
  - revert only the CO-457 packet files, task index item, task snapshot, and registry rows if the packet is rejected.

## Risks & Mitigations
- Risk: packet is mistaken as approval to flip defaults.
  - Mitigation: every packet surface states no model-default changes and preserves `gpt-5.4` as portable fallback only.
- Risk: config-derived `gpt-5.5` is reported as runtime-proven.
  - Mitigation: require source/confidence/degraded reason.
- Risk: missing runtime model metadata blocks useful worker launch.
  - Mitigation: degraded/unknown proof is allowed when truthful.
- Risk: binary/auth provenance scope bleeds into this lane.
  - Mitigation: preserve `CO-450` and `CO-451` as explicit boundaries.

## Approvals
- Reviewer: CO operator / provider-worker parent lane.
- Date: 2026-05-03
