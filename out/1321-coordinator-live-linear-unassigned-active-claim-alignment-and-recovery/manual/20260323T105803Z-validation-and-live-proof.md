# 1321 Validation And Live Proof

## Local Validation
- `node scripts/delegation-guard.mjs --task 1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery`: passed.
- `node scripts/spec-guard.mjs --dry-run`: passed.
- `npm run build`: passed.
- `npm run lint`: passed.
- Focused regressions passed:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "keeps an active claim lifecycle-owned when a direct webhook moves the issue to Human Review with assignee_id null|keeps an active claim lifecycle-owned when a direct webhook moves the issue to In Review with assignee_id null|relaunches a released assignee-changed claim on a same-timestamp webhook when Merging with assignee_id null|relaunches a released assignee-changed claim on refresh when Merging with assignee_id null stays at the same timestamp"` -> `4 passed`.
- Focused file validation passed:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts` -> `130 passed`.
- `npm run test` was executed again on the patched head. The visible suite stayed green through the last visible files, then hit the known host-local Vitest teardown hang with `node (vitest)` left idle/listening on `*:24678`; the idle process was killed after confirming the listener. Treat PR CI as the authoritative terminal full-suite proof for this lane.
- `npm run docs:check`: passed.
- `npm run docs:freshness`: passed.
- `node scripts/diff-budget.mjs`: override accepted with `DIFF_BUDGET_OVERRIDE_REASON="Docs-first 1321 lane requires the full task packet plus the narrow providerIssueHandoff/runtime regression coverage for live CO-3 recovery."`
- `npm run review`: completed in non-interactive handoff mode; review prompt written to `.runs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/cli/2026-03-23T10-29-46-034Z-08278ec8/review/prompt.txt`.
- `npm run pack:smoke`: passed.

## Live CO-3 Proof
- Current control-host state already moved past the original stuck bug without another Linear flip. The live host restarted onto `http://127.0.0.1:63632` with token created at `2026-03-23T10:51:43.413Z`, and `.runs/local-mcp/cli/control-host/provider-intake-state.json` rebound `CO-3` to run `2026-03-23T10-51-47-708Z-411eb683` with `state: "running"` and `reason: "provider_issue_rehydrated_active_run"`.
- The reclaimed provider-worker run completed successfully:
  - manifest: `.runs/linear-902af7c9-9c23-4805-a652-5280723334d7/cli/2026-03-23T10-51-47-708Z-411eb683/manifest.json`
  - `status: "succeeded"`
  - `started_at: "2026-03-23T10:51:47.709Z"`
  - `completed_at: "2026-03-23T10:58:03.012Z"`
- The provider-worker proof confirms clean terminal completion:
  - `provider-linear-worker-proof.json` shows `owner_phase: "ended"`, `owner_status: "succeeded"`, `end_reason: "issue_inactive"`.
- The worker performed real Linear actions after reclaim:
  - `2026-03-23T10:56:16.805Z` `upsert-workpad` `ok:true`
  - `2026-03-23T10:56:40.479Z` `attach-pr` `ok:true` via `github_pr`
  - `2026-03-23T10:57:20.292Z` `upsert-workpad` `ok:true`
  - `2026-03-23T10:57:30.569Z` `transition` `ok:true` to `Done`
  - Evidence: `.runs/linear-902af7c9-9c23-4805-a652-5280723334d7/cli/2026-03-23T10-51-47-708Z-411eb683/provider-linear-worker-linear-audit.jsonl`
- Live Linear now shows `CO-3` as `Done` / `completed` with updated workpad/attachments:
  - `node dist/bin/codex-orchestrator.js linear issue-context --issue-id 902af7c9-9c23-4805-a652-5280723334d7 --format json`
  - The workpad records `PR #289` as superseded and `PR #288` as the landing PR.
- Persisted intake self-healed to the terminal state:
  - `provider-intake-state.json` now records `CO-3` as `issue_state: "Done"`, `issue_state_type: "completed"`, `state: "released"`, `reason: "provider_issue_released:not_active"`.
- `/api/v1/dispatch` is internally consistent after the issue completes:
  - `dispatch_pilot.reason: "dispatch_source_no_eligible_issue"`
  - `recommendation: null`
  - `traceability.issue_identifier: null`

## Truthful Outcome
- `1321` proved the repo-side reclaim bug is fixed: an unassigned active `Merging` issue no longer stays stranded as `provider_issue_released:assignee_changed`, and the reclaimed issue can complete without another operator flip.
- The live `CO-3` worker did not merge conflicting PR `#289`. Instead, it truthfully closed `#289` as superseded after attaching merged PR `#288` and then transitioned the issue to `Done`.
