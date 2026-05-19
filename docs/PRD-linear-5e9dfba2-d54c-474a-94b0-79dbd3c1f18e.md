# PRD - CO-515 control-host source freshness recheck after main advances

## Traceability
- Linear issue: `CO-515` / `5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- Linear URL: https://linear.app/asabeko/issue/CO-515
- Task registry id: `20260518-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- MCP Task ID: `linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- Canonical owner key: `control-host:source-freshness-recheck-after-main-advance`
- Canonical TECH_SPEC: `tasks/specs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- Task checklist: `tasks/tasks-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- Source anchor: `ctx:sha256:e50fbc86099d15a7bd5e45c23028430bd6de7f985de2237cb5ea66b7673567f2#chunk:c000001`
- Source manifest: `.runs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e-docs-packet/cli/2026-05-18T23-15-56-334Z-bed38666/manifest.json`
- Source payload note: this child checkout has no `.runs` tree at its root; the source payload was read read-only from the parent-relative path `../../.runs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e-docs-packet/cli/2026-05-18T23-15-56-334Z-bed38666/memory/source-0/source.txt` and contains run/issue provenance only. The issue-shaping contract below is anchored on the parent-provided CO-515 wording.

## Summary
- Problem Statement: a long-running control-host can keep reporting `source_root_freshness.status=current` or equivalent stale current status even after local `origin/main` advances. When operators rely on `co-status --format json`, `observed_at`, and `source_checkout.head`, that cached or startup-time freshness can make a resident supervised control-host look current while the shared-root posture has moved ahead.
- Desired Outcome: parent implementation makes control-host source freshness trustworthy after `origin/main` advances by rechecking the actual supervised source root against local `origin/main` before reporting current status, while keeping manual `provider-intake-state.json` edits, host restart policy, and provider-worker lifecycle routing out of this lane.

## User Request Translation
- User intent / needs:
  - create the CO-515 docs-first packet and task registration for the parent lane
  - preserve the exact scope: `control-host source freshness`, `origin/main`, `observed_at`, `source_checkout.head`, stale current status, long-running control-host, shared-root posture, resident supervised control-host, `provider-intake-state.json`, and `co-status --format json`
  - make stale-source detection trustworthy after main advances before dependent policy CO-556 adds auto-restart or fail-closed behavior
  - include a CO-555 recurrence fixture so the parent proves a freshly advanced main ref is reflected in source freshness output
- Success criteria / acceptance:
  - `co-status --format json` and related status/proof projections no longer report source freshness as current solely from stale startup/persisted freshness after local `origin/main` advances
  - `observed_at` and `source_checkout.head` reflect the latest recheck against the supervised source root and local `origin/main`
  - current/fresh status is only emitted when the supervised source root is actually current relative to local `origin/main`
  - stale detection remains read-only: no fetch, checkout, reset, rebuild, restart, relaunch, Linear mutation, or manual `provider-intake-state.json` edit is required by this lane
  - CO-555 recurrence fixture proves a resident supervised control-host started before the CO-555 main advance reclassifies stale source freshness instead of keeping stale current status
- Constraints / non-goals:
  - child lane owns docs packet and task registration only
  - parent owns implementation, focused tests, docs-review, Linear state, workpad, PR lifecycle, and final handoff
  - do not hand-edit `provider-intake-state.json`
  - do not use host restart as this lane's fix
  - do not hide source freshness evidence from `co-status --format json`
  - dependent policy CO-556 owns auto-restart and fail-closed behavior after this lane makes stale-source detection trustworthy

## Intent Checksum
- Exact user wording / phrases to preserve:
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
- Protected terms / exact artifact and surface names:
  - `source_root_freshness`
  - `source_checkout.head`
  - `source_checkout.upstream`
  - `source_checkout.behind`
  - `observed_at`
  - `origin/main`
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - resident supervised control-host
  - shared-root posture
  - CO-555 recurrence fixture
  - CO-556 dependent policy
- Nearby wrong interpretations to reject:
  - hand-editing `provider-intake-state.json` to force a fresh-looking status
  - restarting the host as the fix for stale-source detection
  - hiding or omitting source freshness evidence from `co-status --format json`
  - treating shared-root cleanliness as proof that the resident supervised control-host source root is current
  - treating `observed_at` from startup or persisted owner state as a fresh post-main-advance recheck
  - changing provider-worker issue selection, WIP caps, or Linear lifecycle authority

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `source_root_freshness.status` | A long-running control-host can keep stale current status after `origin/main` advances because freshness was captured earlier. | Current status should mean the supervised source root was checked against the current local `origin/main` ref. | Status rechecks local refs and reports stale/warning when `source_checkout.head` is behind `origin/main`. | Automatic restart or fail-closed policy. |
| `observed_at` | A persisted startup-time freshness observation can look like current proof. | Operators need to know when the source freshness comparison was actually observed. | `observed_at` updates with the recheck that produced the current/stale verdict. | Wall-clock SLA policy for forced restarts. |
| `source_checkout.head` | Head data can describe the resident supervised source root before main advanced. | The field should identify the supervised source root head used for the verdict. | `source_checkout.head`, upstream, and behind/ahead counts reflect the latest local comparison. | Fetching remote refs from status reads. |
| Shared-root posture | The shared root may be on current `origin/main` while the resident supervised control-host still runs older source. | Shared-root posture and supervised source-root freshness are separate evidence streams. | `co-status --format json` keeps them distinct and does not infer one from the other. | Shared-root cleanup or merge-closeout policy. |
| `provider-intake-state.json` | Provider-intake can remain useful operational evidence even when source freshness is stale. | Intake evidence should not be manually edited to make source freshness look healthy. | Intake remains source-labeled evidence while source freshness reports its own stale/current truth. | Manual intake edits or provider-worker selection changes. |
| CO-555 recurrence fixture | CO-555 created a real recurrence shape after main advanced and operators needed trustworthy source freshness. | A merged/current-main advance must be visible to resident control-host source freshness detection. | Fixture starts or simulates a resident control-host on an older head, advances local `origin/main` with CO-555-shaped changes, and expects stale/warning with updated `observed_at` and `source_checkout.head`. | Reopening CO-555 provider-intake behavior. |

## Not Done If
- `co-status --format json` can still report `source_root_freshness.status=current` after `origin/main` advances beyond the resident supervised control-host source root.
- `observed_at` does not prove when the comparison was rechecked after main advanced.
- `source_checkout.head` stays on the stale old head while the verdict still says current.
- The implementation treats clean shared-root posture as proof that the long-running control-host source root is current.
- The fix depends on a manual `provider-intake-state.json` edit, a broad host restart policy rewrite, or provider-worker WIP/Linear lifecycle changes.
- The fix hides source freshness evidence instead of making stale evidence explicit.
- CO-556 auto-restart/fail-closed policy is implemented here before stale-source detection is trustworthy.

## Goals
- Create the CO-515 docs-first packet and registry mirrors.
- Define a narrow parent contract for rechecking control-host source freshness after local `origin/main` advances.
- Preserve source freshness provenance in `co-status --format json`, including `observed_at` and `source_checkout.head`.
- Require a CO-555 recurrence fixture that prevents stale current status from recurring.
- Keep restart/fail-closed policy delegated to CO-556.

## Non-Goals
- No implementation or test edits in this child lane.
- No Linear mutation, workpad mutation, GitHub/PR lifecycle, or full validation in this child lane.
- No manual `provider-intake-state.json` edits.
- No broad control-host restart policy rewrite.
- No provider-worker issue selection, WIP cap, admission, or Linear lifecycle authority changes.
- No automatic fetch, checkout, reset, rebuild, restart, or relaunch from a status/proof read path.

## Stakeholders
- Product: CO operators relying on resident supervised control-host status to decide whether queue and source evidence are current.
- Engineering: parent CO-515 provider worker implementing source freshness recheck behavior and focused coverage.
- Review: parent lane and automated reviewers validating that CO-556 restart/fail-closed policy remains separate.

## Metrics & Guardrails
- Primary Success Metrics:
  - CO-555 recurrence fixture fails before the fix and passes after the fix
  - `co-status --format json` reports stale/warning source freshness when `origin/main` advances beyond the resident supervised source root
  - `observed_at` changes on recheck and `source_checkout.head` names the supervised source root commit used for the verdict
  - JSON/text surfaces continue to expose source freshness evidence rather than hiding it
- Guardrails:
  - zero manual `provider-intake-state.json` edits
  - zero restart/relaunch policy implementation in CO-515
  - zero remote fetch or Git mutation from status reads
  - zero provider-worker queue/WIP/Linear lifecycle changes

## Technical Considerations
- Architectural Notes:
  - parent should inspect `sourceRootFreshness` inspection/recheck behavior and the control-host ownership/polling projection that feeds `co-status --format json`
  - freshness relative to `origin/main` should use local refs and fail visibly when the ref is unavailable
  - any persisted owner or startup freshness should be refreshed or clearly marked stale before it is projected as current
  - the implementation should keep shared-root posture distinct from supervised source-root freshness
- Dependencies / Integrations:
  - `orchestrator/src/cli/utils/sourceRootFreshness.ts`
  - control-host owner/polling projection
  - `/ui/data.json`
  - `co-status --format json`
  - `provider-intake-state.json`
  - local Git refs, especially `origin/main`
  - CO-555 recurrence fixture
  - CO-556 dependent policy

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the stale cached-current source freshness seam. Current source freshness must be backed by a fresh local comparison between the resident supervised source root and local `origin/main`.
- Large-refactor check: keep CO-515 bounded to trustworthy stale-source detection and projection. Defer auto-restart/fail-closed behavior to CO-556 unless parent source inspection proves detection cannot be made trustworthy without a broader source freshness helper consolidation.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host source freshness projection | Cached or startup-time freshness can keep stale current status after `origin/main` advances. | remove fallback | CO-515 | Long-running resident supervised control-host source root is behind local `origin/main` while status/proof surfaces still say current. | Observed 2026-05-18 | 2026-05-18 | This issue | Source freshness rechecks local `origin/main` before reporting current and emits stale/warning with updated `observed_at` and `source_checkout.head` when behind. | CO-555 recurrence fixture plus focused source freshness/status projection tests. |

## Open Questions
- Should the parent recheck happen on every `co-status --format json` read, on control-host polling refresh, or through a shared freshness refresh helper feeding both surfaces?
- If local `origin/main` is unavailable, should the status be `unavailable` or `warning` in text output while retaining structured JSON detail?

## Approvals
- Product: CO-515 issue contract supplied by parent lane.
- Engineering: bounded docs-only child lane on 2026-05-18.
- Design: N/A.
