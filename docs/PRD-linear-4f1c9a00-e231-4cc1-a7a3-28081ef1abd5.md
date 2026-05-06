# PRD - CO-506 require full fallback metadata for legacy bounded-success review guidance

## Traceability
- Linear issue: `CO-506`
- Linear issue id: `4f1c9a00-e231-4cc1-a7a3-28081ef1abd5`
- Task id: `linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5`
- Canonical owner key: `review-wrapper:bounded-success-legacy-fallback-metadata`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=review-wrapper:bounded-success-legacy-fallback-metadata`
- Source issue: `CO-478` / `f3aec8da-23c6-459e-acba-a5045b404c7f`
- Source PR: `#782`
- Canonical task spec: `tasks/specs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- Task checklist: `tasks/tasks-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`

## Problem And Outcome
`CO-478` separated wrapper execution success from `review_verdict`, but the provider-worker guidance still says a `legacy succeeded payload` with a preserved `termination_boundary` can be recorded as successful bounded review completion. That legacy path is a retained fallback. It must require full retained-fallback metadata instead of letting `status: succeeded`, `review_outcome: bounded-success`, or a preserved `termination_boundary` stand alone.

CO-506 must require owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence before any legacy succeeded review payload can be treated as acceptable bounded-success guidance. Modern `review/telemetry.json` payloads with `status: succeeded`, `review_outcome: bounded-success`, preserved `termination_boundary`, and `review_verdict` semantics must remain unchanged.

## User Request Translation
- User intent / needs: create the traceability/docs-first packet before this helper-created follow-up leaves `Backlog`, preserving the exact legacy review-wrapper fallback issue and setting up a later implementation that ships guidance and tests.
- Success criteria / acceptance:
  - the six packet files exist
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the packet
  - the packet states the `Backlog` hold reason and that packet/registry setup clears `backlog_head_follow_up_traceability_pending`
  - the packet requires retained-fallback metadata for the `legacy succeeded payload` path
  - later implementation is not docs-only and must include shipped guidance/tests
- Constraints / non-goals:
  - do not implement provider-worker code changes in this packet lane
  - do not transition Linear
  - do not open or modify GitHub PRs
  - do not change Codex review CLI exit-code behavior
  - do not weaken command-intent, bounded-review, `termination_boundary`, or semantic `review_verdict` handling
  - do not broaden into `CO-474` product recovery

## Intent Checksum
- Protected terms / exact artifact and surface names:
  - `review/telemetry.json`
  - `status: succeeded`
  - `review_outcome: bounded-success`
  - `legacy succeeded payload`
  - `preserved termination_boundary`
  - `review_verdict`
  - `retained-fallback metadata`
  - `owner`
  - `trigger`
  - `introduced date`
  - `review date`
  - `maximum lifetime or expiry`
  - `removal condition`
  - `reason`
  - `validation evidence`
- Nearby wrong interpretations to reject:
  - changing Codex review CLI exit-code semantics
  - treating this as a `CO-474` product recovery lane
  - treating `bounded-success` as handoff-clean without checking `review_verdict`
  - accepting a legacy succeeded payload solely because `termination_boundary` is preserved
  - shipping only docs without provider-worker guidance and regression tests in the later implementation

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| Modern telemetry | `review/telemetry.json` can report `status: succeeded`, `review_outcome: bounded-success`, preserved `termination_boundary`, and `review_verdict`. | CO-478 made semantic `review_verdict` the clean-handoff authority. | Preserve modern bounded-success and `review_verdict` behavior. | Changing review CLI exit codes or boundary classification. |
| Legacy succeeded payload | Provider-worker guidance allows a legacy succeeded payload with preserved `termination_boundary` to be recorded as bounded success. | Legacy fallback acceptance needs full fallback metadata. | Require retained-fallback metadata before legacy succeeded payload guidance is acceptable. | Removing modern bounded-success support. |
| Provider-worker guidance | Guidance names legacy payload but does not spell out retained metadata requirements beside that legacy branch. | Break-glass/fallback guidance already requires owner, trigger, dates, lifetime, removal, reason, and evidence. | Guidance must carry the same full metadata list for legacy succeeded payloads. | Broad provider-worker lifecycle rewrite. |
| Review verdict | `review_verdict: findings` or `review_verdict: unknown` must block clean handoff. | Clean handoff requires `review_verdict: clean`. | CO-506 must not let legacy bounded-success wording override `review_verdict`. | Weakening semantic verdict handling. |
| Backlog promotion | Helper-created follow-up is held while packet files and mirrors are missing. | `backlog_head_follow_up_traceability_pending` clears only when packet and registry setup exist. | This packet supplies the repo evidence needed before deliberate promotion. | Transitioning Linear from this packet lane. |

## Not Done If
- A `legacy succeeded payload` with preserved `termination_boundary` can be accepted without owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence.
- `review_outcome: bounded-success` is documented as clean-handoff proof without `review_verdict: clean`.
- The later implementation changes Codex review CLI exit-code behavior.
- The later implementation weakens command-intent, bounded-review, `termination_boundary`, or semantic `review_verdict` handling.
- The later implementation is docs-only and lacks shipped provider-worker guidance/tests.
- The packet omits the `Backlog` hold reason or the `backlog_head_follow_up_traceability_pending` clearance condition.

## Goals
- Create and register the CO-506 docs-first packet while the issue remains in `Backlog`.
- Define the retained-fallback metadata contract for legacy bounded-success review guidance.
- Keep CO-506 scoped to review-wrapper/provider-worker guidance and tests.
- Preserve CO-478's `review_verdict` authority and existing bounded-review guard behavior.

## Non-Goals
- No provider-worker source edits in this packet lane.
- No Codex review CLI exit-code changes.
- No command-intent, bounded-review, `termination_boundary`, or `review_verdict` weakening.
- No `CO-474` product recovery.
- No docs-only final implementation.
- No Linear transition or PR lifecycle work from this packet lane.

## Backlog Hold
CO-506 is a helper-created follow-up that must remain in `Backlog` until the packet files and registry mirrors exist. This packet and the mirror updates are the repo-side evidence that clears `backlog_head_follow_up_traceability_pending`; it does not by itself authorize Linear state transition, provider-worker implementation, or PR handoff.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker review outcome guidance | `legacy succeeded payload` with preserved `termination_boundary` can be described as successful bounded review completion without full retained-fallback metadata. | expire fallback | CO-506 / `review-wrapper:bounded-success-legacy-fallback-metadata` | Provider-worker guidance or docs encounter legacy succeeded telemetry lacking modern `review_outcome` / `review_verdict` fields but carrying a preserved `termination_boundary`. | 2026-05-06 | 2026-05-06 | 2026-06-05 | Legacy succeeded payload support is removed, or any retained legacy path requires owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence before acceptance. | Provider-worker prompt tests, standalone-review guide/help tests, telemetry fixture tests, docs checks, standalone review. |

- Large-refactor check: a narrow guidance/test patch is acceptable because the unsafe seam is a single legacy compatibility interpretation, not a split authority across review execution, semantic verdict parsing, and provider-worker handoff. If implementation must inspect legacy telemetry runtime paths beyond guidance, split or promote the broader review-wrapper refactor instead of adding another minor seam.

## Approvals
- Product: Linear CO-506, pending
- Engineering: packet branch validation plus codex-orchestrator docs-review clean-success, `.runs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5/cli/2026-05-06T19-30-14-566Z-97a6084f/manifest.json`
- Design: N/A
