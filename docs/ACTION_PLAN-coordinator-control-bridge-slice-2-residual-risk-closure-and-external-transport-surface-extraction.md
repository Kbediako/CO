# ACTION_PLAN - Coordinator Control Bridge Slice 2 + Residual Risk Closure + External Transport-Surface Extraction

## Summary
- Goal: prepare an implementation-ready follow-up docs package for 0994 that closes residual risk and freezes extraction/transport decision boundaries before coding.
- Scope: docs/task mirrors, registry updates, docs-review evidence, standalone review checkpoint, and elegance/minimality note.
- Assumptions: 0993 contracts remain baseline; this slice only extends unresolved planning constraints.

## Milestones & Sequencing
1) Docs-first scaffolding and registration
- Create PRD + TECH_SPEC + ACTION_PLAN + canonical spec + checklist mirrors.
- Register 0994 in `tasks/index.json` and prepend 0994 snapshot in `docs/TASKS.md`.

2) Residual risk closure objectives (freeze)
- Record unresolved risk inventory and closure objectives.
- Translate closure objectives into implementation-checkable constraints.

3) Codex-autorunner extraction lane (freeze)
- Define what moves to adapter lane vs what remains in CO core.
- Define invariant and rejection semantics for extraction boundary violations.

4) Discord/Telegram interactive-surface decision criteria (freeze)
- Define explicit go/no-go criteria (security, reliability, interaction mapping, auditability, blast radius).
- Keep transport integration held unless criteria are fully satisfied.

5) Delegated-stream review cadence (mandatory)
- Define required standalone and elegance checkpoint cadence for delegated implementation streams.
- Define hard-stop handling for unresolved P0/P1 high-signal findings.

6) Evidence capture for this docs stream
- docs-review gate:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction`
- standalone review checkpoint:
  - `TASK=0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction NOTES="Goal: docs-first 0994 checkpoint | Summary: verify docs consistency and risk framing | Risks: stale mirrors or missing mandatory sections" npm run review`
- record a short elegance/minimality pass summary in checklist notes.

7) Findings artifact + transport decision record (implementation stream)
- Create findings artifact at `docs/findings/0994-codex-autorunner-extraction-and-transport-go-hold.md`.
- Record codex-autorunner extraction decision as `GO (bounded)`.
- Record Discord/Telegram decision state as `HOLD` until all security/reliability/auditability criteria pass.
- Link artifact in PRD/TECH_SPEC/checklist mirrors.

8) Implementation phase (next stream, not this one)
- Execute codex-autorunner extraction lane and transport-surface decisions only after 0994 docs gates are satisfied.
- Run ordered quality gates and delegated review cadence checkpoints during implementation streams.

## Dependencies
- 0993 artifacts and merged behavior baseline.
- Current AGENTS policy defaults for docs-first and review discipline.
- Existing manifest/event/status audit and traceability conventions.

## Validation
- Required for this stream:
  - docs-review manifest captured for 0994.
  - one standalone review checkpoint captured for this docs stream.
  - checklist note includes elegance/minimality summary.
- Required for next implementation streams:
  - delegated review cadence checkpoints at kickoff, per sub-goal, and pre-handoff.
  - elegance pass after standalone findings are addressed and before handoff.

## Risks & Mitigations
- Risk: 0994 repeats 0993 context without closing true residual risk.
- Mitigation: explicitly enumerate closure objectives and required decisions only.
- Risk: extraction lane scope creep moves core authority out of CO.
- Mitigation: extraction boundary section defines transport-only adapter scope + hard invariants.
- Risk: transport integration pressure bypasses safety criteria.
- Mitigation: explicit go/no-go criteria and hold-default policy.
