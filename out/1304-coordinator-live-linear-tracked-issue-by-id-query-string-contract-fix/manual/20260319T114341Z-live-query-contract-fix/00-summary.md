# 1304 Summary

- Scope completed: registered the docs-first follow-up lane, corrected `buildLinearIssueByIdQuery(...)` from `$issueId: ID!` to `$issueId: String!`, added focused regression coverage, rebuilt the repo, and restarted the persistent `co-control-host`.
- Docs-review passed for the 1304 packet with manifest evidence at `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`.
- Focused regression passed: `npx vitest run orchestrator/tests/LinearDispatchSource.test.ts`.
- Artifact-backed publication rerun logs were written into this directory:
  - `01-delegation-guard.log` (`DELEGATION_GUARD_OVERRIDE_REASON` used because the publication truth-sync reused an existing read-only subagent thread after the spawn limit was reached)
  - `02-spec-guard.log`
  - `03-build.log`
  - `04-lint.log`
  - `05-test.log` (`278` files / `1907` tests passed)
  - `06-docs-check.log`
  - `07-docs-freshness.log`
  - `08-diff-budget.log`
  - `09-review.log` (non-interactive review handoff prompt captured)
  - `10-pack-smoke.log`

## Live Rerun Outcome

- Restart command used:
  - `tmux new-session -d -s co-control-host "/bin/zsh -lc 'cd /Users/kbediako/Code/CO && source ~/.co_provider_env && node dist/bin/codex-orchestrator.js control-host --task local-mcp --run control-host --pipeline diagnostics --format json >> .runs/local-mcp/cli/control-host-tmux.log 2>&1'"`
- Host restart succeeded locally:
  - previous `base_url`: `http://127.0.0.1:58721`
  - restarted `base_url`: `http://127.0.0.1:59254`
  - readiness log: `.runs/local-mcp/cli/control-host-tmux.log`
  - endpoint metadata: `.runs/local-mcp/cli/control-host/control_endpoint.json`
- Live rerun outcome progressed in two stages:
  - initial state after restart: real Linear updates did not reach the restarted host because public forwarding still targeted the pre-restart port
  - after repointing public forwarding to `http://127.0.0.1:59254`, syncing the live webhook secret, and seeding `dispatch_pilot` on the host, both signed manual replays and subsequent real Linear deliveries were accepted
- Verified live evidence:
  - `.runs/local-mcp/cli/control-host/linear-advisory-state.json` now records accepted deliveries, latest tracked issue `CO-1`, and `latest_reason: linear_delivery_accepted`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json` now records claims for both `CO-1` and `CO-2`
  - the claim for `CO-1` maps to `/Users/kbediako/Code/CO/.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/2026-03-19T11-53-41-813Z-62a676f9/manifest.json`
  - the claim for `CO-2` maps to `/Users/kbediako/Code/CO/.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-19T11-53-42-683Z-10f53643/manifest.json`
  - `/api/v1/dispatch` now returns `dispatch_pilot.status=ready` with live recommendation `CO-1`
- Real Linear trigger used for the final proof:
  - `CO-1` was toggled `In Progress -> Blocked -> In Progress` so the restarted host would receive a real started-issue delivery after the public forwarding fix
- Current blocker classification:
  - `downstream child-run guard failure after successful webhook acceptance and provider-intake claim`
  - exact evidence: both mapped child runs currently stop at `status_detail: stage:delegation-guard:failed`, so the query contract and live provider ingress are now proven, but downstream autonomous execution still fails immediately after claim/handoff
- See `13-live-rerun-evidence.md` in this directory for the exact live state files and child-run manifest references used for this closeout.
