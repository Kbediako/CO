# PRD - Codex 0.111 + GPT-5.4 Compatibility + Adoption Realignment (1012)

## Summary
- Problem Statement: the local Codex CLI has moved to `0.111.0` with `model = "gpt-5.4"`, but local review/custom-role surfaces were also moved to `gpt-5.4-codex`, which fails under ChatGPT-account auth and blocks normal delegation-first orchestration. At the same time, CO's shipped docs/templates/defaults still describe an older `gpt-5.3-codex` single-baseline posture and older version-policy guidance.
- Desired Outcome: restore delegation-first operation in the real local `0.111.0` environment, adopt `gpt-5.4` for the top-level and high-reasoning subagent/review surfaces that actually run under ChatGPT auth, record the live `[agents]` parser workaround when it appears, and update CO defaults/docs/tests so they match the proven compatibility contract instead of stale policy text.

## User Request Translation (Context Anchor)
- User intent / needs: read the handover, verify the current runtime and repo state, complete the Codex `0.111.0` plus `gpt-5.4` / `gpt-5.4-codex` compatibility lane first, then continue the next approved Coordinator slice.
- Success criteria / acceptance:
  - Direct local probes clearly distinguish what works vs fails under the current ChatGPT-auth environment.
  - A docs-first task bundle records the compatibility decision and exact repo/local surfaces affected.
  - Delegation-first orchestration is restored locally with `gpt-5.4` subagent surfaces, or an explicit temporary override reason is recorded in evidence.
  - Repo defaults/docs/templates/doctor surfaces stop implying a stale single-model baseline.
  - Manual simulated/mock usage checks confirm the chosen split baseline.
- Constraints / non-goals:
  - Stay docs-first and delegation-first by default.
  - Treat the existing dirty worktree as intentional in-flight state.
  - Do not use `gpt-5.4-codex` on ChatGPT-auth role or review surfaces while it remains rejected.
  - Do not widen scope into unrelated runtime refactors or broad RLM model changes.

## Goals
- Restore local delegation compatibility by moving unsupported ChatGPT-auth Codex role/review surfaces off `gpt-5.4-codex` and onto `gpt-5.4`.
- Adopt a mostly-unified `gpt-5.4` baseline for the current lane:
  - top-level `model = "gpt-5.4"`,
  - `review_model = "gpt-5.4"`,
  - managed and local high-reasoning subagent role files use `gpt-5.4`,
  - `explorer_fast` remains on `gpt-5.3-codex-spark`.
- Update CO docs/templates/defaults/tests/version guidance to match this `gpt-5.4` baseline.
- Record explicit hold boundaries for RLM/alignment and other older Codex-role surfaces until separate compatibility evidence exists.

## Non-Goals
- Promoting `gpt-5.4-codex` to any ChatGPT-auth default.
- Reworking RLM alignment model routing in this lane.
- Changing `explorer_fast` away from `gpt-5.3-codex-spark` without separate evidence.
- Starting the next Coordinator slice before this compatibility decision is evidence-backed.

## Stakeholders
- Product: CO maintainers and downstream users inheriting CO starter configs and docs.
- Engineering: the local top-level Orchestrator agent and downstream operators using Codex defaults, review flows, and delegated roles.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - Local `gpt-5.4` probe succeeds.
  - Local `gpt-5.4` target-subagent probe succeeds.
  - Local `gpt-5.4-codex` probe is explicitly captured as unsupported under ChatGPT auth and held from defaults.
  - `doctor` / starter config / handbook guidance all agree on the same `gpt-5.4` baseline with the explicit `explorer_fast` exception.
- Guardrails / Error Budgets:
  - Preserve additive config-update behavior.
  - Preserve existing RLM/alignment pins unless a new compatibility decision explicitly changes them.
  - Keep historical findings docs historical; supersede them with a new task-scoped decision instead of silently rewriting history.

## User Experience
- Personas: local top-level orchestrator, downstream init-template users, maintainers auditing compatibility evidence.
- User Journeys:
  - A local operator on ChatGPT auth can run `gpt-5.4` top-level without breaking review/delegation.
  - A downstream user running `codex-orchestrator codex defaults --yes` gets a compatible starter config and advisory text.
  - A maintainer reading docs can tell which surfaces are adopted, held, or explicitly unsupported under current auth.

## Technical Considerations
- Architectural Notes:
  - `codexDefaultsSetup` and `doctor` currently assume an older `gpt-5.3-codex` baseline and need to move to `gpt-5.4`, including `review_model`.
  - CO-managed templates only cover `worker_complex`, `explorer_fast`, and `awaiter`; local-only custom roles still need explicit operator guidance and local repair in this lane.
  - Native `codex` `0.111.0` on this machine currently rejects live `[agents] max_depth` / `max_spawn_depth` with `expected struct AgentRoleToml`; the local workaround is to remove only those two live keys while keeping repo docs/templates on the intended `12/4/4` baseline until upstream parser behavior changes.
- Dependencies / Integrations:
  - Local `codex` CLI behavior under ChatGPT auth.
  - OpenAI Codex config reference and official Codex model docs.
  - Existing CO docs/templates/tests that currently encode `gpt-5.3-codex`.

## Decision Log
- Decision (2026-03-06): adopt `gpt-5.4` across top-level, review, and high-reasoning subagent role surfaces for this lane; hold only `gpt-5.4-codex`.
- Rationale: local probes show `gpt-5.4` succeeds while `gpt-5.4-codex` fails under ChatGPT auth, and the user explicitly wants subagents on `gpt-5.4` with `explorer_fast` kept on spark.
- Decision (2026-03-06): if native `codex` startup reproduces the live `[agents]` parser bug, remove only `max_depth` and `max_spawn_depth` from `~/.codex/config.toml` and capture the workaround in 1012 evidence.

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
