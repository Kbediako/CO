# ACTION_PLAN - linear-0b606d2f-d31c-40a0-8709-e0aec86396ee

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: ship a supported macOS launchd supervision surface for the root `control-host` so operators no longer depend on a copied host-local wrapper.
- Scope: docs-first packet, audited docs-review child stream, new supervision CLI surface, focused tests for plist or state or health behavior, and the normal validation or review handoff flow.
- Assumptions:
  - the smallest supportable surface is a nested `control-host supervise` command family
  - launchd should continue to own process restarts while the packaged CLI owns config rendering, install ergonomics, runtime health polling, and status truth

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `installable local control-host supervision`, `co-control-host-supervisor.sh`, `LaunchAgent`, `launchd`, `control-host`, `co-status`, `restart_required`, install or uninstall or status or restart ergonomics, and separation from queue-management and merge-policy logic.
- Not done if: the final path still requires copying one machine's shell script, still hard-codes one machine's repo or Node path, or still hides restart reasons behind opaque launchd behavior.
- Pre-implementation issue-quality review: approved. The lane is specifically about root-host local supervision, not queue orchestration, merge flow, or child-runtime parity work.

## Milestones & Sequencing
1. Create the CO-117 docs packet, task mirrors, freshness registry entries, task snapshot, and single workpad source, then run audited `linear child-stream --pipeline docs-review`.
2. Add the new `control-host supervise` command surface plus install/config/plist/status logic.
3. Implement the long-lived supervision runner with env/bootstrap sourcing, explicit runtime selection, health polling, unhealthy restart thresholding, and persisted restart-reason state.
4. Add focused tests for CLI help or parsing, config rendering, runtime loop behavior, status output, and launchctl interactions.
5. Run the required validation floor, standalone review, explicit elegance pass, and refresh the workpad before PR or review handoff.

## Dependencies
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- new supervision helper files under `orchestrator/src/cli/control/`
- `orchestrator/tests/CodexOrchestratorCli.test.ts`
- new or updated control-host supervision tests
- macOS `launchctl` surface assumptions for install or restart or uninstall behavior

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-0b606d2f-d31c-40a0-8709-e0aec86396ee node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-117-docs-review --format json`
  - focused Vitest coverage for the new supervision CLI and runtime surfaces
  - required repo validation floor after implementation
  - `npm run pack:smoke`
- Rollback plan:
  - revert the new supervision CLI family and generated-artifact helpers together so existing manual host-local workflows remain the fallback until a revised shipped path lands

## Risks & Mitigations
- Risk: launchd install ergonomics become brittle if runtime discovery depends on ambient PATH.
  - Mitigation: persist explicit install-time executable and entrypoint paths in config and plist generation.
- Risk: the supervision slice broadens into queue or merge policy because it touches `control-host`.
  - Mitigation: keep the runner limited to launching `control-host`, polling `co-status`, and persisting restart reasons only.
- Risk: status output remains too opaque for operators to understand restart loops.
  - Mitigation: persist a small machine-readable state file and surface it directly in `status`.

## Approvals
- Reviewer: pending audited `codex-orchestrator docs-review` child stream for the CO-117 packet
- Date: 2026-04-09
