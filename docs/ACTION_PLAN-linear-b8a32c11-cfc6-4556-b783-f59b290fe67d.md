# ACTION_PLAN - CO Run Codex 0.117.x-to-main Canary for Multi-Agent-v2 and App-Server Adoption
## Summary
- Goal: complete a bounded `0.117.x` to upstream-main adoption canary for CO without widening authority boundaries or guessing about richer app-server control semantics.
- Scope: docs-first packet, upstream/CO baseline audit, targeted active-guidance/runtime updates, additive lineage capture changes if supported by current payloads, and canary evidence plus recommendation artifacts.
- Assumptions: installed local CLI remains `codex-cli 0.117.0`, `/Users/kbediako/Code/codex` stays aligned to `origin/main` and `upstream/main`, and provider workers continue to own issue state while the canary evaluates richer supervision options conservatively.
## Milestones & Sequencing
1. Draft and register the CO-22 docs-first packet, then capture docs-review evidence before code edits.
2. Verify the live upstream baseline and current CO runtime/docs surfaces, then land bounded corrections to active defaults, policy text, and lineage handling.
3. Run canary/validation evidence collection, refresh the workpad with the final recommendation, and only then decide whether review handoff is justified.
## Dependencies
- Required local baseline references under `/Users/kbediako/Code/codex`.
- Existing CO runtime/policy surfaces in `AGENTS.md`, `docs/guides/codex-version-policy.md`, `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, and `orchestrator/src/cli/services/commandRunner.ts`.
- Reference report: `/Users/kbediako/.codex/reports/2026-03-27-codex-0.117.0-co-alignment.md`.
## Validation
- Checks / tests: docs-review before implementation; required repo floor (`delegation-guard`, `spec-guard --dry-run`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, `review`, and `pack:smoke` if downstream-facing CLI/package surfaces change); local canary artifacts for runtime-mode and bounded multi-agent/app-server evidence.
- Rollback plan: revert the active-guidance/default updates and additive lineage-capture changes together if the canary or review surfaces a regression, keeping the explicit defer rationale in the docs packet.
## Risks & Mitigations
- Risk: CO overstates app-server readiness and implicitly widens authority. Mitigation: keep the recommendation bounded to observability/control-substrate planning, not authority changes.
- Risk: CO invents richer lineage data that current exec/app-server history does not actually expose. Mitigation: preserve stable thread-id fields and only add metadata when observed; otherwise document the defer reason explicitly.
- Risk: stale `max_spawn_depth` references remain in operator-facing guidance. Mitigation: update active policy/default surfaces and record any untouched historical references as historical, not current posture.
## Approvals
- Reviewer: Self-reviewed against the active issue constraints and required upstream baseline before implementation. Date: 2026-03-28
