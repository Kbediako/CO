# PRD - Runtime Default Flip Readiness Automation (0983)

## Summary
- Problem Statement: We need stronger, repeatable dummy-repo evidence before flipping the runtime default to ChatGPT-login-first appserver mode, plus a clear policy for when gate `10` (`pack:smoke`) runs.
- Desired Outcome: automate runtime-mode canary simulations in dummy repos, define explicit flip thresholds, and flip default runtime mode only when evidence is sufficient.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): run automation-heavy dummy simulations until confidence is high enough to set appserver as default; keep docs relevant and decide release/update posture.
- Success criteria / acceptance:
  - Docs-first artifacts for this follow-up are complete.
  - Runtime canary automation exists and produces deterministic evidence under `out/0983-runtime-default-flip-readiness-automation/manual/`.
  - Default-flip decision is evidence-backed; if thresholds pass, default flips to `runtimeMode=appserver` with `cli` break-glass preserved.
  - `pack:smoke` cadence policy is explicitly documented.
- Constraints / non-goals:
  - Minimal, high-leverage changes only.
  - Keep CO as control plane; no destructive git operations.
  - Preserve compatibility via explicit fallback and rollback guidance.

## Goals
- Automate dummy-repo runtime canaries (appserver success lane, forced fallback lane, unsupported combo lane).
- Make `start` command failure semantics deterministic for automation (`failed` run => non-zero process exit).
- Decide and document gate `10` cadence policy.
- Decide and document whether release/global upgrade is needed for confidence testing.

## Non-Goals
- Large runtime architecture refactor.
- Cloud-mode redesign.
- Removing `runtimeMode=cli` break-glass support.

## Stakeholders
- Product: CO maintainers deciding runtime default readiness.
- Engineering: operators and downstream users validating package behavior.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - Canary matrix pass rate meets thresholds defined in TECH_SPEC.
  - Fallback and unsupported-mode assertions are deterministic (100% in forced scenarios).
  - Docs/checklist mirrors remain consistent.
- Guardrails / Error Budgets:
  - No manifest schema breakage.
  - Required validation gates pass in order with evidence.

## User Experience
- Personas: operators running CO in default mode, maintainers reviewing rollout safety.
- User Journeys:
  - Run one command to execute dummy-repo runtime canary matrix and inspect summary.
  - Understand exactly when gate `10` is required (task-based trigger + time-based backstop).

## Technical Considerations
- Architectural Notes:
  - Reuse existing runtime provider seam and pack-smoke packaging approach.
  - Add a focused canary automation script instead of broad framework changes.
- Dependencies / Integrations:
  - `npm pack`/install in temp repos.
  - runtime selector + manifest observability fields from 0981.

## Open Questions
- Should full npm release wait for one additional post-merge soak window after default flip?

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
