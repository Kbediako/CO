# Action Plan - Codex Orchestrator NPM Companion Package Publishability (Task 0916)

## Status Snapshot
- Current Phase: Implementation complete (guardrails + pack audit/smoke captured)
- Run Manifest Link: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`
- Metrics / State Snapshots: `.runs/0916-npm-companion-package-publishability/metrics.json`, `out/0916-npm-companion-package-publishability/state.json`
- Approvals / Escalations: Docs-review + implementation gate approved (see manifests)

## Milestones & Tasks
1. Milestone: Planning + evidence setup
   - Tasks:
     - Draft PRD/TECH_SPEC/ACTION_PLAN + mini-spec.
     - Create checklist + mirrors (`tasks/`, `.agent/task/`, `docs/TASKS.md`).
     - Run docs-review pipeline and record manifest.
2. Milestone: Packaging + CLI surface
   - Tasks:
     - Define `files` allowlist and pack audit rules.
     - Ensure schema resolution (Pattern A + fallback) and acceptance tests.
     - Implement MCP/CLI commands (`mcp serve`, `self-check`, `init`, `doctor`).
     - Add template safeguards (README disclaimer + version markers).
3. Milestone: Release workflow + guardrails
   - Tasks:
     - Add prepack/pack audit + smoke test CI gates.
     - Implement tag-driven release with immutable artifact + provenance.
     - Document release download fallbacks (gh + github-script + curl).
     - Run guardrail commands and capture review manifest.

## Risks & Mitigations
- Risk: Tarball leaks internal artifacts.
  - Mitigation: strict `files` allowlist + pack audit + smoke test.
- Risk: MCP stdout contamination.
  - Mitigation: enforce stderr logging and stdout-only protocol tests.
- Risk: optional deps missing in user envs.
  - Mitigation: doctor command with exact install guidance.

## Next Review
- Date: Not scheduled (complete).
- Agenda: Post-release check-in if publish coordination resumes.
