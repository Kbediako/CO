# ACTION_PLAN - CO-474 Ready Accepted/No-Run Revalidation Recovery

## Goal / Guardrails
Make explicit `control-host recover` / relaunch / nudge for a `Ready issue` in `accepted/no-run` `provider_issue_rehydration_pending_revalidation` state either start with run manifest provenance or fail fast before `request timeout 120000ms`.
Preserve protected terms: `CO-470`, `CO-472`, `control-host recover`, `Ready issue`, `accepted/no-run`, `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, `request timeout 120000ms`. Do not implement CO-470 fixture-env cleanup, rewrite CO-472, manually edit `provider-intake-state.json`, relax admission caps, directly start `provider-linear-worker`, or use the micro-task path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker recover | Accepted/no-run pending-revalidation recovery treated as indefinite inflight truth | remove fallback | CO-474 | Ready issue has null run/manifest/launch and no retry error | observed 2026-05-01 | N/A after removal | N/A after removal | Explicit recover launches/retries or fails fast deterministically without occupying capacity | Focused lifecycle and handoff regressions |

## Sequence
Accept docs packet, reproduce the CO-470 shape, inspect `ProviderIssueHandoff` and control-host recovery lifecycle, implement bounded recover/retry/fail-fast handling, add focused lifecycle and handoff regressions, then run validation, standalone/elegance review, PR attach, ready-review drain, and Linear review handoff.

## Validation
Focused ProviderIssueHandoff/control-server lifecycle regressions; delegation guard; spec guard; build; lint; full test; docs checks; freshness; stewardship; diff budget; manifest-backed standalone review; explicit elegance pass; and `npm run pack:smoke` because control-host/package behavior is touched.

Rollback if duplicate-launch safety, CO-472 adjacency, or deterministic fail-fast evidence cannot be preserved.
