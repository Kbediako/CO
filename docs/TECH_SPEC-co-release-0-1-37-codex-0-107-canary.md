# TECH_SPEC - CO 0.1.37 Release + Codex 0.107 Canary

- Canonical TECH_SPEC: `tasks/specs/0985-co-release-0-1-37-codex-0-107-canary.md`.
- Owner: Codex.
- Last Reviewed: 2026-02-27.

## Summary
- Ship patch release `0.1.37` from current `main` and validate Codex `0.107.x` prerelease compatibility in dummy repos before global version-policy change.

## Requirements
- Complete release workflow with signed tag + GitHub release + npm publish evidence.
- Execute automated dummy-repo canary matrix for:
  - stable baseline `codex-cli 0.106.0`
  - prerelease candidate `codex-cli 0.107.x`
- Produce explicit recommendation:
  - `keep stable 0.106.0`
  - or `adopt 0.107.x` (only with sufficient evidence).

## Canary Acceptance Threshold
- Mandatory lanes (both versions):
  - CLI init + doctor usage
  - review/run-review (including appserver request fallback semantics)
  - flow/rlm smoke
  - cloud compatibility/fail-fast checks
- Decision threshold:
  - No P0/P1 regressions vs stable baseline.
  - >=95% scenario pass rate across mandatory lanes.
  - No ambiguous run states in fallback/failure paths.

## Evidence & Artifacts
- Manifests: `.runs/0985-co-release-0-1-37-codex-0-107-canary*/cli/*/manifest.json`.
- Logs: `out/0985-co-release-0-1-37-codex-0-107-canary/manual/*`.
- Checklist mirrors:
  - `tasks/tasks-0985-co-release-0-1-37-codex-0-107-canary.md`
  - `.agent/task/0985-co-release-0-1-37-codex-0-107-canary.md`
  - `docs/TASKS.md`
  - `tasks/index.json`

## Rollback
- Release rollback: publish follow-up patch if needed; keep prior tag immutable.
- Codex policy rollback: keep global stable pin at `0.106.0` and re-run canary later.

## Execution Outcome (2026-02-27)
- CO release completed: `0.1.37` published with signed tag `v0.1.37` and downstream smoke verification.
- Canary parity observed across tested fallback/fail-fast lanes for stable `0.106.0` and prerelease `0.107.0-alpha.4`.
- Required cloud lane remained blocked (`CODEX_CLOUD_ENV_ID` missing), so global default update to `0.107.x` is NO-GO pending required cloud-lane rerun.
