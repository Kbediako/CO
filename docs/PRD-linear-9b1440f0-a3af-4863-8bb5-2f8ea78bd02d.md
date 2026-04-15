# PRD - CO: reclaim Ready released-pending-reopen issues after blockers clear

## Traceability
- Linear issue: `CO-193` / `9b1440f0-a3af-4863-8bb5-2f8ea78bd02d`
- Task id: `linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d`
- Canonical spec: `tasks/specs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- Parent run evidence: `.runs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d/cli/2026-04-15T15-14-04-331Z-0bebe30c/manifest.json`
- Rejected docs child lane: `.runs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d-docs-packet/cli/2026-04-15T15-16-50-425Z-60b069ba/manifest.json`
- Source anchor: `ctx:sha256:497972dcd0d65946049eb88b42d9e1b5799ac2393f6d2a00ff032fa98ea2313c#chunk:c000001`

## Summary
`CO-193` fixes a control-host admission gap where a Linear issue can remain Ready/unstarted and eligible after blockers are Done, but provider-intake still retains a stale `released` claim with reason `provider_issue_released_pending_reopen:provider_issue_released:not_active`. The expected outcome is an automatic reclaim/requeue path, or a clear actionable recovery state, when there is no active claim, no live same-issue worker, no retry queued, and known blockers are terminal. Safety remains strict: reclaim must not duplicate a genuinely live same-issue worker and must not delete or discard dirty workspace work.

## User Request Translation
- Reclaim Ready/unstarted `released-pending-reopen` issues after prior blockers clear.
- Preserve exact CO-191-shaped evidence: stale parent manifest, no matching live process, empty active claims, dirty workspace, no retry queued, and retained `released` provider-intake reason `provider_issue_released_pending_reopen:provider_issue_released:not_active`.
- Keep this separate from `CO-192`, which fixes stale active-row projection in CO STATUS; this lane fixes pickup/reclaim behavior.
- Keep existing worker admission caps, real blocker checks, and same-issue live-worker protections intact.

## Intent Checksum
- Protected terms and surfaces: `released-pending-reopen`, `provider_issue_released_pending_reopen:provider_issue_released:not_active`, `CO-191 shape`, `provider-intake-state.json`, `Ready`, `unstarted`, `active_claims`, `provider_issue_poll_deferred_for_fresh_discovery`, `deferredClaimFreshDiscoveryBlockedProviderKeys`, `fresh_discovery`, `provider_debug_snapshot.claim`, `co-status --format json`, `dirty workspace`, `provider-linear-worker-proof.json`, `run_manifest_path`, and live same-issue worker.
- Nearby wrong interpretations to reject: do not treat this as display-only CO STATUS projection, do not merge it into `CO-192` unless pickup behavior is covered, do not solve it by deleting dirty workspaces, do not bypass blocker checks, do not raise admission caps, and do not duplicate-launch while a same-issue worker is genuinely live.

## Parity / Alignment Matrix

| Surface | Current / Reference Truth | Target Truth |
| --- | --- | --- |
| Ready retained claim | A Ready issue can stay suppressed behind `released` / `provider_issue_released_pending_reopen:provider_issue_released:not_active` after blockers clear. | Eligible Ready issues are reclaimed/requeued or marked with a clear actionable recovery reason. |
| Blocker handling | Non-terminal blockers must prevent pickup. | Terminal blockers no longer suppress pickup; non-terminal blockers still produce blocker-specific waiting reasons. |
| Fresh discovery | Fresh discovery can see eligible Ready issues. | Stale released pending-reopen claims must not block their own fresh-discovery reclaim path when no live worker exists. |
| Dirty workspace | Dirty workspaces can exist during recovery. | Dirty work is preserved and surfaced; reclaim does not delete or discard it. |
| Live same-issue worker | `CO-189` protects active same-issue workers hidden behind released claims. | `CO-193` preserves that protection and avoids duplicate start/resume while reclaiming only no-live-worker Ready issues. |

## Acceptance Criteria
- A regression seeds a Ready issue with a stale released-pending-reopen claim, all blockers Done, no active claim, no retry queued, a dead/no worker PID, and an existing dirty workspace.
- The refresh/fresh-discovery path reclaims/requeues the issue, or records an actionable eligible-for-reclaim state for operator surfaces.
- Reclaim preserves dirty workspace contents and never performs destructive workspace cleanup as part of this recovery.
- Reclaim does not call `launcher.start` or `launcher.resume` when a same-issue worker is genuinely live.
- Provider-intake and CO STATUS reason text distinguish waiting for blockers, waiting for live worker, and eligible-for-reclaim/reclaim-launched states.
- Validation covers the CO-191 shape plus existing CO-189 live-worker rehydration behavior.
- Targeted tests, `npm run build`, and the relevant control-host/provider-intake test slice pass.

## Non-Goals
- No worker admission cap weakening or broad scheduler redesign.
- No Linear workflow mutation or label/filter workaround.
- No direct deletion of dirty workspaces or stale manifests without a separate audited recovery path.
- No duplicate worker launch for a same-issue live lane.
- No display-only CO STATUS fix that leaves pickup suppressed.

## Not Done If
- CO-191-shaped issues can remain Ready with released-pending-reopen/not-active, no active claim, no live worker, no retry queued, and no automatic reclaim or nudge path.
- Reclaim starts a duplicate worker while a same-issue worker is live.
- Dirty partial workspace work is lost without audit and explicit recovery handling.
- Non-terminal blockers are ignored.
- CO STATUS/provider-intake cannot explain whether the issue is waiting on blockers, waiting on a live worker, or eligible for reclaim.

## Validation Contract
- Add focused provider-intake handoff coverage for the CO-191 Ready released-pending-reopen shape.
- Rerun existing CO-189 live-worker rehydration coverage to prove no duplicate worker regression.
- Run `node scripts/spec-guard.mjs --dry-run`, `npm run build`, and the relevant focused test slice before review handoff.
