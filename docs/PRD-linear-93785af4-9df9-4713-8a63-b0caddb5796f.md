# PRD - CO-460 stale tracked.linear advisory fallback regression

## Traceability
- Linear issue: `CO-460` / `93785af4-9df9-4713-8a63-b0caddb5796f`
- Linear URL: https://linear.app/asabeko/issue/CO-460/co-status-prevent-stale-co-1-trackedlinear-advisory-fallback
- Task id: `linear-93785af4-9df9-4713-8a63-b0caddb5796f`
- Canonical spec: `tasks/specs/linear-93785af4-9df9-4713-8a63-b0caddb5796f.md`
- Canonical registry id: `20260501-linear-93785af4-9df9-4713-8a63-b0caddb5796f`
- Source anchor: `ctx:sha256:7e2f368111d599f3b3737fa64148d04c895b885e7e81a638904b0d2da180485e#chunk:c000001`
- Source manifest: `.runs/linear-93785af4-9df9-4713-8a63-b0caddb5796f/cli/2026-05-01T04-35-42-108Z-11573cdd/manifest.json`
- Source payload: `.runs/linear-93785af4-9df9-4713-8a63-b0caddb5796f/cli/2026-05-01T04-35-42-108Z-11573cdd/memory/source-0/source.txt`

## Summary
- Problem Statement: `co-status --format json` can again surface stale top-level `tracked.linear` advisory fallback data for `CO-1` even while provider-intake and current control-host state are fresh. The observed stale advisory state came from `linear-advisory-state.json` and reflected March 2026 activity while the provider-intake snapshot was generated at `2026-05-01T02:52:40.455Z`.
- Desired Outcome: `co-status`, `/api/v1/state`, and `/ui/data.json` must never display stale `CO-1` as active tracked work when current authoritative tracked issue truth is unavailable. They should expose `tracked.linear=null` or a current authoritative tracked issue, with machine-readable stale/unavailable evidence.

## User Request Translation
- User intent / needs:
  - repair the stale `tracked.linear` advisory fallback regression without widening into provider-intake summary drift or binary/model provenance issues
  - keep `co-status --format json`, `/api/v1/state`, `/ui/data.json`, `linear-advisory-state.json`, `provider_intake.updated_at`, and `CO-1` as protected surfaces
  - preserve the regression lineage to `CO-223` and `CO-255`
  - prove old retained advisory files cannot repopulate active tracked work after control-host restart
- Success criteria / acceptance:
  - stale `linear-advisory-state.json` with fresh provider/control-host state is covered by a regression fixture
  - top-level `tracked.linear` is null or authoritative-current, never stale `CO-1`
  - CLI, API, and UI status surfaces agree on the fail-closed behavior
  - restart/seed-loading tests prove old advisory files are stale-marked and suppressed
  - docs and task mirrors link the CO-223 / CO-255 regression family
- Constraints / non-goals:
  - do not redesign `provider_intake` selection or concurrent-claim summary semantics
  - do not address binary, model, or source-root provenance drift in this lane
  - do not weaken current selected-run identity conflict suppression
  - do not make stale advisory data look current by copying it into provider-intake or selected-run fields

## Intent Checksum
- Exact phrases to preserve:
  - `co-status --format json`
  - `tracked.linear`
  - `linear-advisory-state.json`
  - `provider_intake.updated_at`
  - `/api/v1/state`
  - `/ui/data.json`
  - `CO-1`
  - `CO-223`
  - `CO-255`
- Nearby wrong interpretations to reject:
  - fixing only the UI renderer while `co-status --format json` or `/api/v1/state` still expose stale `CO-1`
  - treating fresh provider-intake summary drift as the root problem for this issue
  - trusting an old retained `linear-advisory-state.json` when no current provider/control-host truth validates the tracked issue
  - hiding the stale advisory by omitting all machine-readable unavailable/stale evidence
  - touching binary/model provenance or global source-root freshness work in this lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `co-status --format json` | Can show stale top-level `tracked.linear.identifier=CO-1` from retained advisory state after restart. | CO-223 / CO-255 established that top-level tracked Linear fallback must fail closed when stale. | Shows `tracked.linear=null` or a current authoritative tracked issue; stale advisory state has a machine-readable stale reason. | Provider-intake summary ranking or binary/model provenance. |
| `/api/v1/state` | Shares the compatibility projection and can inherit the same top-level `tracked` payload. | API state should match the same read model as CLI status. | Matches `co-status`: no stale `CO-1`; unavailable tracked truth is explicit. | New mutating API behavior. |
| `/ui/data.json` | Builds the operator dashboard dataset from the compatibility projection and can inherit stale top-level `tracked`. | UI dataset should not display advisory fallback as active work unless current authority validates it. | Matches API/CLI behavior so the UI cannot display stale `CO-1` as active work. | UI redesign or unrelated dashboard fields. |
| Control-host restart | Seed loading normalizes retained advisory and provider-intake files. | Restart should reclassify stale retained advisory files before the runtime snapshot is used. | Fresh provider-intake/control-host truth marks old unmatched advisory state stale and suppresses it from projection. | Deleting historical files or weakening persisted audit evidence. |

## Not Done If
- `co-status --format json` can still return top-level `tracked.linear.identifier=CO-1` from stale March 2026 advisory data.
- `/api/v1/state` and `/ui/data.json` disagree with `co-status` on the tracked Linear fallback result.
- A fresh provider/control-host snapshot that no longer validates the retained advisory issue leaves `linear-advisory-state.json` eligible for active tracked projection.
- The fix only handles selected-issue identity conflicts and not the no-authoritative-current-truth restart case.
- The lane changes provider-intake summary drift, binary/model provenance, or source-root freshness behavior.
- The CO-223 / CO-255 regression relationship is missing from docs or task evidence.

## Goals
- Fail closed when retained Linear advisory state is older than fresh provider/control-host truth and lacks current validation.
- Preserve current authoritative tracked issue projection when it is validated by current source truth.
- Keep CLI, API, and UI status surfaces aligned through the shared compatibility projection.
- Add regression coverage for stale advisory seed state after control-host restart.

## Non-Goals
- No provider-intake ranking or summary-scope redesign.
- No binary/model provenance changes.
- No source-root freshness or linked-global-binary behavior changes.
- No broad status/dashboard schema redesign beyond machine-readable stale/unavailable evidence needed for this issue.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the stale advisory fallback seam for active tracked work. Retained `linear-advisory-state.json` remains audit evidence, but it cannot repopulate `tracked.linear` unless current authority validates it.
- Rationale: the stale `CO-1` projection is cached fallback behavior on a high-churn control-host status surface; fail-closed behavior is the smallest safe fix.

## Open Questions
- None. Source inspection identified the narrow gap: stale marking currently requires a newer matching provider-intake claim, but this regression needs stale marking when fresh provider-intake/control-host truth no longer validates the retained advisory issue.

## Approvals
- Product: CO-460 issue body and acceptance criteria.
- Engineering: provider-worker implementation lane.
- Design: N/A.
