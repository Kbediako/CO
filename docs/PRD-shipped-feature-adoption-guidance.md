# PRD - Shipped Feature Adoption Guidance Hardening (0977)

## Summary
- Problem Statement: CO already supports cloud and RLM flows, but in practice many repos still run mostly diagnostics/docs-review without routinely using higher-leverage paths. Guidance exists but is fragmented across `setup`, `doctor --usage`, and selective command paths.
- Desired Outcome: ship stronger in-product guidance in core CLI surfaces so agent users naturally discover and use `flow`, cloud, and RLM paths without breaking existing automation contracts.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): improve shipped Codex Orchestrator behavior so feature utilization improves across codebases on this device, especially when users are agents (mostly Codex), by strengthening steering/help in core product surfaces.
- Success criteria / acceptance:
  - `--help` surfaces include actionable quickstart guidance for feature adoption.
  - Runtime guidance is visible in normal command usage (not only `exec`) when adoption signals indicate under-use.
  - Guidance remains non-blocking, low-noise, and JSON-safe.
  - Shipped skills include explicit adoption defaults so agents route to the right capabilities consistently.
  - Mock/dummy repo simulation demonstrates stable hint quality and no contract regressions.
- Constraints / non-goals:
  - Keep changes additive and minimal.
  - Do not change core cloud/RLM execution semantics in this slice.
  - Do not introduce hard failures for non-adopters.

## Decision Statement
- Decision: implement a minimal steering layer composed of (1) help quickstart guidance, (2) text-mode runtime adoption hints for `start`/`flow`, (3) recommendation de-duplication in `doctor --usage`, and (4) shipped skill guidance alignment.
- Why now: this addresses underutilization inside shipped CO behavior with low blast radius and preserves compatibility.

## Assumptions, Unknowns, Risks
- Assumptions:
  - Most users for this product are agent operators, so concise command examples are more effective than long prose.
  - Existing `doctor --usage` heuristics are sufficient if we reduce duplicate/noisy recommendations.
- Unknowns:
  - Exact false-positive rate for runtime hints across heterogeneous repos.
  - Whether one hint per run is enough for behavior change without requiring follow-up nudges.
- Risks:
  - Accidental stdout contamination in JSON modes.
  - Overly frequent hints causing operator fatigue.
  - Drift between top-level and subcommand help text.

## Goals
- Improve discoverability of `flow`, cloud, and RLM usage paths in shipped CLI help.
- Provide low-friction runtime steering during `start`/`flow` text runs.
- Keep JSON output contracts stable for automation.
- Align shipped skills with canonical adoption defaults.

## Non-Goals
- No new pipeline framework or adaptive profile engine.
- No per-repo customization in downstream repos.
- No enforcement-only gate that blocks users from baseline commands.

## Stakeholders
- Product: CO maintainer(s) and downstream operators.
- Engineering: orchestrator CLI/runtime and docs/skills maintainers.
- Design: CLI UX/help maintainers.

## Metrics & Guardrails
- Primary Success Metrics:
  - Help discoverability: quickstart guidance present in top-level/start/flow help.
  - Runtime steering coverage: hints emitted in eligible text-mode `start`/`flow` runs when recommendations exist.
  - Quality: low false-hint rate in simulation (target <= 15% on labeled scenarios).
  - Compatibility: zero JSON parse regressions in command-surface tests.
- Guardrails / Error Budgets:
  - Max one adoption hint per run output surface.
  - No hint emission in JSON/JSONL outputs.
  - Hinting remains fail-open (never changes command exit behavior).

## User Experience
- Personas:
  - Agent users running CO in multiple local codebases.
  - Human maintainers validating adoption posture.
- User Journeys:
  - `--help` quickly shows recommended command path for docs-first and advanced capabilities.
  - `start`/`flow` text runs emit one concise next-step hint when usage signals show underutilization.
  - Skills read by agents reinforce the same canonical routing defaults.

## Technical Considerations
- Architectural Notes:
  - Reuse current `runDoctorUsage` recommendation engine.
  - Reuse and generalize existing `maybeEmitExecAdoptionHint` behavior for text-mode run commands.
  - Keep guidance emission centralized and mode-aware.
- Dependencies / Integrations:
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/doctorUsage.ts`
  - `tests/cli-command-surface.spec.ts`
  - `skills/docs-first/SKILL.md`
  - `skills/delegation-usage/SKILL.md`
  - `skills/collab-subagents-first/SKILL.md`

## Phased Plan & Gates
1. Research gate: delegated research + review findings captured and translated into chosen option set.
2. Docs gate: PRD + TECH_SPEC + ACTION_PLAN + task checklist complete; docs-review + docs guards pass.
3. Simulation gate: mock/dummy repo tests show acceptable hint quality, low noise, and no JSON contract leakage.
4. Implementation gate: minimal code + tests merged for selected option set only.
5. Verification gate: required validation chain + standalone review + elegance pass complete.

## Open Questions
- Should hint emission eventually include `resume` text mode, or stay limited to `start`/`flow` in this slice?
- After dogfooding, should adoption hints gain a configurable aggressiveness level?

## Approvals
- Product: user
- Engineering: user
- Design: user
