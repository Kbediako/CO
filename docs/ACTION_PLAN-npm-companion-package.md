# Action Plan - Codex Orchestrator NPM Companion Package (Task 0914)

## Status Snapshot
- Current Phase: Planning collateral + docs-review.
- Run Manifest Link: `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- Metrics / State Snapshots: `.runs/0914-npm-companion-package/metrics.json`, `out/0914-npm-companion-package/state.json`.
- Approvals / Escalations: None yet; safe `read/edit/run/network` profile expected.

## Milestones & Tasks
1. Milestone: Planning collateral + docs-review
   - Tasks:
     - Draft PRD, tech spec, action plan, mini-spec, and checklist.
     - Run docs-review gate and record manifest evidence in mirrors (`docs/TASKS.md`, `.agent/task`, `tasks/index.json`).
2. Milestone: Packaging + tarball audit
   - Tasks:
     - Add `files` allowlist, `prepack`, and `pack:audit` scripts; clean dist before packing.
     - Add pack audit gate in CI and pack smoke test in release workflow.
     - Tighten pack audit to allow only runtime `dist/` subtrees and explicitly reject `dist/patterns/**` or other non-runtime build output.
3. Milestone: Schema resolution + runtime assets
   - Tasks:
     - Add `imports` alias for schema resolution with fallback.
     - Add schema resolver tests and enforce required assets in pack audit.
4. Milestone: CLI companion surface + templates
   - Tasks:
     - Add `mcp serve`, `self-check`, and `init codex` commands.
     - Ensure `mcp serve` stdout/stderr guarantees hold when delegating to `codex` (wrapper or integration test) and document the dependency.
     - Create `templates/` with README disclaimer and `templateVersion` markers.
5. Milestone: Optional deps + doctor
   - Tasks:
     - Convert Playwright-class deps to optional peer deps.
     - Add dynamic import loader and `doctor` command with install guidance.
6. Milestone: Release workflow
   - Tasks:
     - Tag-driven release workflow with immutable tarball and dist-tag rules.
     - Document preferred and fallback release asset download methods.

## Risks & Mitigations
- Risk: Tarball leakage (internal artifacts shipped).
  - Mitigation: `files` allowlist + pack audit + CI gate + smoke test.
- Risk: MCP protocol corruption from stdout logging.
  - Mitigation: enforce stdout-only protocol; test stderr logging; validate downstream `codex` output when delegating.
- Risk: Review handoff becomes interactive in CI.
  - Mitigation: add explicit non-interactive guard for `codex review` or document required env/flags and fail fast if prompts occur.
- Risk: Optional deps missing in user environments.
  - Mitigation: `doctor` command + dynamic import guard + clear install instructions.
- Risk: Schema resolution breaks in packaged layout.
  - Mitigation: `imports` alias + fallback resolution + tests.

## Next Review
- Date: 2025-12-28
- Agenda: Approve collateral, confirm docs-review evidence plan, and align on release workflow constraints.
