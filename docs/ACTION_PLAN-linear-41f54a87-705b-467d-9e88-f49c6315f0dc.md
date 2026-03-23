# ACTION_PLAN - Workflow Reload with Last-Known-Good Fallback

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-6` / `41f54a87-705b-467d-9e88-f49c6315f0dc`
- Linear URL: https://linear.app/asabeko/issue/CO-6/co-add-workflow-reload-with-last-known-good-fallback

## Summary
- Goal: Finish Linear issue `CO-6` by adding reload-safe provider workflow/config handling that matches the Symphony contract: startup fails closed, later reload failures keep the last known good state, and recovery clears the error.
- Scope: docs-first packet, pre-implementation docs-review, one bounded control-host workflow/config store, provider-launch wiring, focused tests, validation, PR prep, and Linear handoff.
- Assumptions:
  - the correct CO seam is the repo-local `codex.orchestrator.json` used by the control-host provider launch path
  - the issue remains in an active started state until a PR is attached and the team review handoff is ready

## Milestones & Sequencing
1) Register the docs-first packet for `linear-41f54a87-705b-467d-9e88-f49c6315f0dc`, update `tasks/index.json`, update `docs/TASKS.md`, and keep the single persistent `## Codex Workpad` comment current.
2) Run docs-review with an explicit delegation override for this worker run because subagent spawning is unavailable in-session.
3) Implement a control-host provider workflow/config store that validates startup state, snapshots the effective config, records reload failures, and retains the last known good snapshot after reload failures following a successful startup.
4) Thread the store into provider child launch/resume behavior by adding an explicit repo-config path override and exposing workflow health through current observability reads.
5) Add focused tests for startup failure, good-to-bad reload retention, and bad-to-good recovery.
6) Run validation, refresh the docs packet and workpad with final evidence, prepare the PR, and stop coding at `In Review`.
7) After merge, archive the implementation-doc packet per `docs/implementation-docs-archive-policy.json` through the automation workflow (sync to `doc-archives` and open the stub PR) or the manual fallback `npm run docs:archive-implementation`, then record the resulting archive PR URL or fallback evidence in the closeout packet and `docs/TASKS.md` when the archive window is reached.

## Dependencies
- `codex.orchestrator.json`
- `orchestrator/src/cli/config/userConfig.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- control-host observability files under `orchestrator/src/cli/control/`
- Symphony baseline from a local checkout referenced via `$SYMPHONY_BASE` (set it to your Symphony clone when reproducing the parity audit)

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" npx codex-orchestrator start docs-review --format json --no-interactive --task linear-41f54a87-705b-467d-9e88-f49c6315f0dc`
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - `npm run docs:archive-implementation` (manual fallback when the archive window is reached and automation is unavailable)
- Rollback plan:
  - remove the control-host workflow/config store and override wiring if it changes behavior outside the provider workflow seam
  - keep the issue in an active workflow state until the fix or blocker is explicit

## Risks & Mitigations
- Risk: a strict repo-config check accidentally changes unrelated pipeline/config behavior.
  - Mitigation: scope strict behavior to the provider control-host path and keep default config resolution unchanged elsewhere.
- Risk: snapshot persistence drifts from the source config and hides operator errors.
  - Mitigation: record reload status, last error, and source/snapshot paths in observability while logging every failed reload attempt.
- Risk: required validation finds unrelated branch noise.
  - Mitigation: separate unrelated failures from the acceptance-criteria evidence and do not overstate completion.

## Approvals
- Reviewer: docs-review complete
- Date: 2026-03-23

## Manifest Evidence
- Docs-review manifest: `.runs/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/cli/2026-03-23T21-28-58-155Z-8084cffd/manifest.json`
- Validation summary: final rerun passed for delegation/spec guards, build, lint, sanitized `npm run test` (`293` files / `2244` tests), docs gates, diff-budget override, non-interactive review prompt generation, and sanitized `npm run pack:smoke`. Review prompt: `.runs/linear-41f54a87-705b-467d-9e88-f49c6315f0dc/cli/2026-03-23T21-11-09-591Z-71302aba/review/prompt.txt`.
