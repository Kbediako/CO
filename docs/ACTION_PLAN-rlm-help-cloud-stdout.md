# ACTION_PLAN - RLM Help + Cloud Fallback Stdout (0965)

## Summary
- Goal: tighten RLM and cloud CLI UX for agent-first usage and ship the improvements downstream via npm.
- Scope: `rlm --help` behavior, `start` output summary surfacing, doctor guidance tweak, and support docs for initiatives 1–3.

## Milestones and Sequencing
1) Docs + task scaffolding
  - Add PRD/TECH_SPEC/ACTION_PLAN + task checklist + registry entries for 0965.
  - Add support guides for RLM recursion v2 + cloud preflight/fallback.
2) Implementation
  - Ensure `handleRlm` treats `--help` as a pure help path (no run start).
  - Emit `manifest.summary` in `start` output payloads (text + json).
  - Update `doctor` cloud enablement guidance to mention fallback semantics.
3) Validation
  - Run required quality gates (build/lint/test/docs).
  - Manual E2E: `rlm --help` and cloud-preflight fallback output.
4) Ship
  - Open PR, watch checks/reviews, merge when green.
  - Cut a patch release so npm/downstream users get the fixes.

## Guardrails
- Keep changes minimal and backwards-compatible.
- Avoid broad CLI refactors; fix only the surface issues described here.

