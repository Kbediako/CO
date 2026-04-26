# PRD - CO-354 multi_agent_v2 thread-limit safe defaults

## Traceability
- Linear issue: `CO-354` / `bf27af4a-01b6-4006-a39b-a9c668be8548`
- Linear URL: https://linear.app/asabeko/issue/CO-354/co-make-defaults-and-doctor-safe-for-codex-multi-agent-v2-thread-limit
- Task id: `linear-bf27af4a-01b6-4006-a39b-a9c668be8548`
- Canonical spec: `tasks/specs/linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`
- Parent manifest: `../../.runs/linear-bf27af4a-01b6-4006-a39b-a9c668be8548/cli/2026-04-25T09-04-25-100Z-c08fa974/manifest.json`
- Source anchor: `ctx:sha256:f41514f405a6c76f80270e9cdd318046797d8c705fe2830e6e3e478f8c4e47be#chunk:c000001`

## Summary
- Problem Statement: Codex CLI `0.125.0` rejects `agents.max_threads` when experimental `features.multi_agent_v2=true`, but CO doctor/default setup still treats `agents.max_threads` as an unconditional seeded baseline.
- Desired Outcome: CO keeps the normal `features.multi_agent=true` thread baseline while failing safely for `multi_agent_v2` users by avoiding invalid `agents.max_threads` writes and recommendations.

## User Request Translation
- User intent / needs: complete CO-354 in this provider workspace by updating doctor/default/init behavior, tests, and docs so CO remains compatible with current stable multi-agent guidance and experimental `multi_agent_v2` config rules.
- Success criteria / acceptance:
  - doctor/default/init setup detects `features.multi_agent_v2=true`
  - CO does not generate or recommend `agents.max_threads` for `multi_agent_v2`
  - normal `features.multi_agent=true` and older Codex behavior keep the existing baseline
  - tests cover stable, experimental, feature-list-only v2, nonnumeric-present, and older feature-list shapes
  - docs/templates say the thread baseline is conditional under `multi_agent_v2`
- Constraints / non-goals:
  - do not remove the standard thread baseline for normal `multi_agent` users
  - do not promote `multi_agent_v2` as a default feature
  - do not broaden into unrelated Codex model/version adoption

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Codex CLI 0.125.0`
  - `features.multi_agent_v2=true`
  - `agents.max_threads`
  - `features.multi_agent=true`
  - `doctor/default setup`
  - `experimental multi_agent_v2`
- Protected surfaces:
  - `orchestrator/src/cli/doctor.ts`
  - `orchestrator/src/cli/codexDefaultsSetup.ts`
  - `orchestrator/src/cli/init.ts`
  - `orchestrator/src/cli/utils/codexFeatures.ts`
  - `orchestrator/tests/Doctor.test.ts`
  - `orchestrator/tests/CodexDefaultsSetup.test.ts`
  - `orchestrator/tests/InitTemplates.test.ts`
  - `AGENTS.md`
  - `templates/codex/AGENTS.md`
  - delegation guidance docs
- Nearby wrong interpretations to reject:
  - remove `agents.max_threads` for all users
  - treat `multi_agent_v2` as the new local default
  - silently write config that Codex `0.125.0` rejects
  - rewrite broader delegation/collab policy

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Stable Codex multi-agent | CO recommends/writes `agents.max_threads = 12` as seeded baseline. | `features.multi_agent=true` remains the normal stable guidance. | Preserve current baseline behavior when `multi_agent_v2` is absent or false. | Removing standard thread tuning for all users. |
| Experimental `multi_agent_v2` | CO still treats `agents.max_threads` as universally valid. | Codex CLI `0.125.0` rejects `agents.max_threads` with `features.multi_agent_v2=true`. | Detect enabled `multi_agent_v2` from config or feature-list state and avoid invalid writes/recommendations. | Promoting `multi_agent_v2` or requiring users to enable it. |
| Repo init | `init codex` copies a static `.codex/config.toml` with the normal thread baseline. | Experimental `multi_agent_v2` users need generated config without `agents.max_threads`. | Strip the copied max_threads key when active feature/config state says `multi_agent_v2=true`; preserve the static normal baseline otherwise. | Removing the normal template baseline for all users. |
| Docs/templates | Some guidance implies `agents.max_threads` is always valid. | Thread guidance must match feature-gate behavior. | Docs say max_threads is a normal baseline except under `multi_agent_v2`. | Broad docs freshness or version policy refresh. |

## Not Done If
- CO silently writes `agents.max_threads` when `features.multi_agent_v2=true`, including when that truth is only visible from `codex features list`.
- Doctor reports a missing `agents.max_threads` baseline as advisory without explaining `multi_agent_v2` incompatibility.
- Existing `features.multi_agent=true` users lose the baseline.
- Tests do not cover `multi_agent_v2`, feature-list-only v2 behavior, and older feature-list behavior.
- Docs continue to imply `agents.max_threads` is always valid.

## Goals
- Make doctor/default/init setup `multi_agent_v2` aware.
- Preserve stable `multi_agent` behavior.
- Add targeted regression coverage.
- Align shipped docs/templates with the conditional thread-limit rule.

## Non-Goals
- No Codex CLI version pin or release policy change.
- No broader delegation configuration redesign.
- No app-server/runtime-mode changes.
- No unrelated docs cleanup.

## Stakeholders
- Product: CO maintainers and downstream operators using CO defaults.
- Engineering: doctor/default/init setup, tests, docs/templates, provider-worker validation.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - targeted doctor/default/init tests pass
  - docs and templates explicitly cover `multi_agent_v2`
  - review finds no behavior regression for normal `multi_agent`
- Guardrails / Error Budgets:
  - zero invalid `agents.max_threads` writes under `multi_agent_v2`
  - zero loss of baseline for stable `multi_agent`
  - smallest compatible code change

## Technical Considerations
- Architectural Notes:
  - `codexDefaultsSetup` writes user config and must omit incompatible keys before mutation.
  - `init codex` copies a repo-local config template and must remove incompatible `agents.max_threads` when the active feature/config state is v2.
  - `doctor` reads Codex features and config, then reports `codex_defaults.checks.max_threads`; its result type and summary should distinguish skipped/incompatible status from advisory missing config.
  - Feature detection should be tolerant of older Codex versions that do not list `multi_agent_v2`.
- Dependencies / Integrations:
  - Codex feature list parsing
  - TOML config read/write
  - doctor summary formatting
  - Vitest test harness

## Open Questions
- None blocking. Treat missing `multi_agent_v2` feature list entries as older/stable behavior.

## Approvals
- Product: parent CO-354 lane, pending
- Engineering: docs-review and standalone review, pending
- Design: N/A
