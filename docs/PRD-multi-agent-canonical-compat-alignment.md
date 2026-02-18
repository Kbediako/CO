# PRD - Multi-Agent Canonical Terminology + Compatibility Alignment (0972)

## Summary
- Problem Statement: CO still uses mixed legacy `collab` and canonical `multi_agent` wording across docs/help text, which risks operator confusion and future churn if legacy aliases are deprecated upstream.
- Desired Outcome: Make `multi_agent` the canonical feature-gating language across CO while preserving compatibility for stable legacy contracts (`--collab`, `RLM_SYMBOLIC_COLLAB`, `manifest.collab_tool_calls`).

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Deliberate on whether CO should migrate off legacy collab naming, then implement a robust/flexible path using docs-first so downstream users and global skills stay aligned.
- Success criteria / acceptance:
  - User-facing guidance is canonical-first (`multi_agent`) with explicit legacy alias notes.
  - Stable runtime/schema/public interface names that currently use `collab` remain backward compatible.
  - Additive canonical CLI/env aliases are available so users can prefer `--multi-agent`/`RLM_SYMBOLIC_MULTI_AGENT` and canonical role-policy env knobs (`RLM_SYMBOLIC_MULTI_AGENT_ROLE_POLICY`, `RLM_SYMBOLIC_MULTI_AGENT_ALLOW_DEFAULT_ROLE`) without breaking legacy usage.
  - Non-blocking legacy-usage warnings guide migration away from `--collab`/`RLM_SYMBOLIC_COLLAB`.
  - Migration policy is documented so future tightening can happen without breaking downstream users.
  - Validation confirms no behavior regressions in feature detection paths and includes manual CLI smoke checks (not just automated tests).
- Constraints / non-goals:
  - No breaking rename of manifest/schema keys.
  - No forced removal of the `--collab` flag in this phase.

## Goals
- Reduce ambiguity between collab workflow naming and Codex feature-gating keys.
- Keep downstream/npm users safe from sudden compatibility breaks.
- Centralize migration policy so future deprecation handling is deliberate.
- Provide a lower-friction canonical path (`--multi-agent`) while preserving legacy compatibility.

## Non-Goals
- Replacing collab workflow terminology in skill names or task history.
- Renaming persisted artifact fields (`collab_tool_calls`) in this phase.
- Large refactor of RLM/collab runtime internals.

## Stakeholders
- Product: CO maintainers and downstream users.
- Engineering: orchestrator CLI/runtime maintainers.
- Design/Docs: documentation + skill maintainers.

## Metrics & Guardrails
- Primary Success Metrics:
  - Canonical `multi_agent` wording appears in docs/help where feature enablement is described.
  - Compatibility behaviors (`multi_agent` preferred, `collab` fallback) remain explicitly tested.
  - No regression in docs hygiene and targeted tests.
- Guardrails / Error Budgets:
  - Preserve legacy aliases/interfaces as additive compatibility.
  - Keep changes narrowly scoped to wording/policy + minimal compatibility hardening.

## User Experience
- Personas:
  - Agent-first user operating CO across mixed repos.
  - Downstream npm user relying on shipped docs/skills.
- User Journeys:
  - User reads setup/usage docs and sees one canonical flag (`multi_agent`) plus clear legacy caveats.
  - User on older environments still succeeds due fallback behavior.

## Technical Considerations
- Architectural Notes:
  - Treat `collab` as workflow language; treat `multi_agent` as feature gate.
  - Preserve current env/schema compatibility surfaces until a dedicated deprecation phase.
  - Add canonical alias support in CLI/env handling and warn when legacy-only surfaces are used.
- Dependencies / Integrations:
  - `orchestrator/src/cli/doctor.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `README.md`, `docs/guides/*`, `skills/*`

## Open Questions
- No blocker for phase-2. Phase-3 follow-up only: choose the alias-removal release once upstream deprecation timing is confirmed.

## Deliberation Decision (2026-02-18)
- Chosen approach: hybrid migration (canonical-first + compatibility-safe aliases), not full rename.
- Rationale: full rename now would risk breaking persisted schema/API contracts (`manifest.collab_tool_calls`) and downstream automation.

## Future Cutover Direction (when upstream drops legacy alias)
- Keep local compatibility aliases in CO (`--collab`, `RLM_SYMBOLIC_COLLAB`) mapped to canonical controls for one migration window.
- Keep legacy alias warnings non-blocking during that window.
- Remove local aliases only through a dedicated phase-3 task with explicit release-note migration guidance and downstream smoke validation.
- Preserve `manifest.collab_tool_calls` until a schema-versioned migration plan is approved.

## Approvals
- Product: user
- Engineering: user
- Design: n/a
