# ACTION_PLAN - Advanced Capability Autopilot + Usage Signal Hardening (0971)

## Phase 1 - Docs-first scaffold
1. Add PRD + TECH_SPEC + ACTION_PLAN + task checklist mirrors.
2. Register task/spec in `tasks/index.json` and `docs/TASKS.md`.
3. Capture delegation scout + docs-review evidence.

## Phase 2 - Implementation
1. Implement `advanced-mode=auto` routing status behavior and bounded auto scout stage wiring.
2. Add structured cloud fallback reason in manifest/output paths.
3. Tighten RLM auto symbolic activation to large-context-only default.
4. Extend doctor usage + run-summary KPI surfacing.
5. Add/refresh tests for all touched behaviors.
6. Follow-up (2026-02-18): add collab lifecycle hygiene diagnostics (`doctor --usage`) for likely unclosed spawned-agent threads + likely spawn thread-limit failures.
7. Follow-up (2026-02-18): harden shipped collab/delegation skills with explicit close-sweep recovery pattern.

## Phase 3 - Validation and handoff
1. Run full guardrail command chain.
2. Run standalone post-implementation review + explicit elegance pass.
3. Update checklist evidence and handoff summary.
4. Verify `doctor --usage` summary line now surfaces lifecycle leak/thread-limit signals with deterministic wording.
   - Evidence: `out/0971-advanced-capability-autopilot/manual/follow-up-validation-20260218-201823.log`.
