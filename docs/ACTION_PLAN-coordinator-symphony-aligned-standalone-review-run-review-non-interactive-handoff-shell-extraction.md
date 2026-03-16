# ACTION_PLAN: Coordinator Symphony-Aligned Standalone Review Run-Review Non-Interactive Handoff Shell Extraction

1. Move the cohesive post-prompt artifact/env/non-interactive handoff cluster behind a dedicated helper/module without widening scope beyond the remaining pre-launch handoff setup.
2. Rewire `scripts/run-review.ts` so `main()` delegates artifact creation, env export, and printed-handoff eligibility while keeping prompt assembly, execution-boundary preflight, launch execution, and telemetry/reporting local.
3. Add focused regressions, run the deterministic docs-first bundle, and record an explicit docs-review override if the registration-time wrapper stops before a diff-local verdict.
