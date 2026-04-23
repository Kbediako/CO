# Docs Freshness Classification - CO-300

## Current Main Baseline
- Date: `2026-04-22`
- `docs:freshness`: `4390` docs, `4393` registry entries, `16` stale docs, `0` missing-on-disk rows, `0` invalid rows, and `0` uncatalogued docs.
- Pre-fix `docs:freshness:maintain`: `block_diff_local`, `owner_issue=CO-175`, `owner_issue_action=update_existing`, and `blocking_changed_paths=[]`.
- Historical issue context only: the earlier CO-300 packet preserved a superseded shared-checkout snapshot of `4307` docs, `4316` registry entries, `53` stale docs, and `6` missing-on-disk registry references.

## Live Debt
- Hard-stale path: `docs/codex-orchestrator-issues.md`.
- Historical candidate debt: `15` candidate entries across `6` candidate cohorts, concentrated in the Mar 22 Task Packet / Task Mirror lineage including `1317` and `1318`.
- Canonical-owner drift: both `CO-175` and `CO-267` are terminal, so live ownership must move to `CO-300`.

## Non-Repros
- The earlier six missing-on-disk registry references do not reproduce on current `origin/main` as of `2026-04-22`.
- No current-main uncatalogued drift reproduces in the refreshed baseline.

## Planned Disposition
- Refresh, archive, or reclassify the live Mar 22 stale cohort set with explicit rationale instead of blind `last_review` bumps.
- Resolve hard-stale `docs/codex-orchestrator-issues.md` with reviewed evidence.
- Add fail-closed regression coverage so terminal owner issues cannot remain `update_existing`.

## Reviewed Disposition
- Re-home canonical owner metadata from terminal `CO-175` / `CO-267` to live owner `CO-300` in `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, and the current task registry mirrors.
- Refresh the exact Mar 22 `1317` / `1318` packet-and-mirror rows because the current `docs/TASKS.md` and `tasks/index.json` snapshots still match those packets' intended historical/current-state references; no archive or reclassification is warranted for this cohort on Apr 22.
- Refresh the adjacent parity packet rows `docs/ACTION_PLAN-coordinator-symphony-full-parity-hardening-and-closure.md`, `docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md`, `docs/TECH_SPEC-coordinator-symphony-full-parity-hardening-and-closure.md`, and `docs/TECH_SPEC-coordinator-symphony-post-worker-retry-queue-ownership.md` because they remain truthful active historical references in the current parity lineage and do not require content reclassification.
- Refresh `docs/codex-orchestrator-issues.md` as reviewed historical/reference guidance rather than treating it as a stale open-issues surface.

## Post-refresh Result
- `docs:freshness` now passes on current branch state with `4397` docs, `4400` registry entries, `0` stale docs, and `0` missing/invalid/uncatalogued drift. Evidence: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/after/docs-freshness.json`.
- `docs:freshness:maintain` now returns `clean`, `owner_issue=CO-300`, `owner_issue_action.mode=update_existing`, `owner_issue_verification.state=In Progress`, `owner_issue_verification.state_type=started`, and `blocking_changed_paths=[]`. Evidence: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/after/docs-freshness-maintenance.json`.
- The Apr 22 lane preserved the earlier six missing-on-disk rows as non-repro historical context only; no current-main missing-on-disk drift remained to repair.
