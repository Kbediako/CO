# **Action Plan — Codex-Orchestrator**

> **Source Context:** tasks/0001-prd-codex-orchestrator.md, tasks/tasks-0001-codex-orchestrator.md, tasks/specs/tech-spec-0001-codex-orchestrator.md
>
> **Status:** Updated 2025-10-16 — Milestones M1–M3 complete with guardrails and documentation signed off.

## Status Snapshot — 2025-10-16
- **Canonical sources:** `tasks/0001-prd-codex-orchestrator.md`, `tasks/tasks-0001-codex-orchestrator.md`, `tasks/specs/tech-spec-0001-codex-orchestrator.md` (all with `last_review` 2025-10-16).
- **Run evidence:** `.runs/3/*` (orchestrator core), `.runs/4/*` (learning library), `.runs/5/*` (evaluation harness), `.runs/6/2025-10-16T18-49-34Z` (spec guard, lint, eval harness for documentation rollout).
- **Open follow-up:** None — Task 6 documentation mirrors and release notes approved (see `.runs/6/2025-10-16T18-49-34Z/manifest.json` capturing spec guard, lint, and eval harness validations).

## Local MCP Harness Usage — Update 2025-10-18
- **Preconditions:** Install and authenticate the Codex CLI, ensure Node.js ≥18 is available (for `npx`), and maintain optional `jq` if you want pretty-printed manifests. No background process is required; the harness is launched per session.
- **Launching via MCP client (recommended):**
  1. From the repository root run `npx @wong2/mcp-cli --config ./mcp-client.json`. This spawns `scripts/run-local-mcp.sh`, opens a stdio session, and writes a fresh `.runs/local-mcp/<timestamp>/` bundle (`manifest.json`, `mcp-server.log`, `result.json`).
  2. When the CLI prompts for a server, choose `codex-local`, then select the `codex` tool and provide the requested `approval_policy` (e.g., `never`, `on-request`, `on-failure`). Each session requires a single approval choice; subsequent tool calls reuse it.
  3. Use `tools/call edit`/`call-tool` to modify files, `tools/call run` for commands such as `npm run lint`, and capture the resulting artifact references in the run manifest before exiting the CLI. Leaving the CLI terminates the MCP server and finalizes `result.json`.
- **Using the harness in other codebases:** Copy or symlink `mcp-client.json`, or point `--config` at this repository’s file (`npx @wong2/mcp-cli --config /path/to/CO/mcp-client.json`). Because `npx` downloads the CLI on demand, no per-project dependency is required; teams preferring a global install can run `npm install -g @wong2/mcp-cli` and invoke `mcp-cli --config …`. For a copy/paste setup, create a global symlink once:
  ```bash
  ln -s "/Users/asabeko/Documents/Code/CO/scripts/run-local-mcp.sh" /usr/local/bin/codex-local-mcp
  chmod +x /usr/local/bin/codex-local-mcp
  ```
  Then drop this config into any repo so agents can launch the same harness:
  ```json
  {
    "mcpServers": {
      "codex-local": {
        "command": "codex-local-mcp"
      }
    }
  }
  ```
- **Always-on sessions:** The architecture intentionally scopes runs so each invocation of `scripts/run-local-mcp.sh` produces auditable artifacts. Avoid keeping long-lived background servers; instead, start a session when work begins and stop (Ctrl+C or exit the CLI) after run manifests are written.
- **Workflow integration:** Builder/tester agents operate exclusively through MCP edits so every diff and command is mirrored under `.runs/<task>/<timestamp>/`. Reviewers cross-check those manifests with spec guard status before marking checklists complete. Mirrors (`docs/`, `.agent/`) must reflect any process updates immediately after a run is marked `[x]` with completion date + manifest path.
- **Quick reference checklist:**
  1. Confirm Codex CLI auth + Node.js, optionally install `jq`.
  2. Launch `npx @wong2/mcp-cli --config ./mcp-client.json` (or equivalent) and pick `codex-local`.
  3. Set the desired `approval_policy`, run edits/tests through MCP tools, and update `manifest.json` with command output.
  4. Exit the CLI to stop the server, then attach the `.runs/local-mcp/<timestamp>/` artifact path to the task checklist entry before marking it complete.

## Milestone M1 — Skeleton Orchestrator & MCP Demo
- Objective: Establish repo scaffolding with working Agents SDK manager, handoffs, and local MCP demo editing one file end-to-end.
- Tasks:
  1. Reviewer — Secure approvals for architecture mini-spec (`tasks/specs/0001-orchestrator-architecture.md`); Acceptance: spec status set to `in-progress`→`done` in `/tasks/index.json`, approval signatures captured; Effort: 0.5 day; Risks: stakeholder misalignment → Mitigation: host quick walkthrough before sign-off.
  2. Manager — Draft orchestrator core mini-spec (`tasks/specs/0002-orchestrator-core.md`) and route for approval; Acceptance: spec stub created, approvals captured, `/tasks/index.json` updated with `last_review` ≤30 days; Effort: 1 day; Risks: unclear persistence requirements → Mitigation: validate with security and platform leads before submission.
  3. Manager — Finalize bootstrap instructions and approval workflow notes in `AGENTS.md`; Acceptance: approvals captured, SOP hooks documented; Effort: 1 day; Risks: SOP drift → Mitigation: schedule quick security review. **Status:** Completed; see `AGENTS.md` (2025-10-16 update) and `.runs/6/2025-10-16T18-19-14Z/diff.patch`.
  4. Builder — Implement manager/builder/tester stubs in `orchestrator/src` and wire to `codex mcp-server`; Acceptance: `scripts/run-local-mcp.sh` executes demo edit producing diff artifact; Effort: 3 days; Risks: MCP config mismatch → Mitigation: add dry-run validation script.
  5. Tester — Author smoke tests under `orchestrator/tests` validating MCP run plus lint/test commands; Acceptance: `npm test` green with recorded logs in `.runs/`; Effort: 2 days; Risks: flaky MCP responses → Mitigation: cache fixtures, add retry logic.

## Milestone M2 — Parallel Goals & Learning Library
- Objective: Enable Codex Cloud parallelism and seed learning assets (≥2 codemods, 1 linter) with adapters.
- Tasks:
  1. Reviewer — Draft and approve learning library mini-spec (`tasks/specs/0003-learning-library.md`); Acceptance: spec added to `/tasks/index.json` with `last_review` ≤30 days and approval signatures captured; Effort: 0.5 day; Risks: scope creep → Mitigation: limit first iteration to two codemods + one linter.
  2. Manager — Configure Codex Cloud workspace integration and document approval toggles; Acceptance: `scripts/run-parallel-goals.ts --dry-run` enumerates planned jobs; Effort: 2 days; Risks: approval misconfiguration → Mitigation: require dry-run sign-off before live runs.
  3. Builder — Implement codemods/linters/templates under `patterns/` with reusable APIs; Acceptance: assets versioned and sample usage recorded in `/tasks/index.json`; Effort: 4 days; Risks: regressions on target repos → Mitigation: add rollback notes and fixture coverage.
  4. Reviewer — Validate learning ingestion SOP and update `docs/TECH_SPEC.md` & `docs/TASKS.md`; Acceptance: documentation references new assets and guardrails; Effort: 1 day; Risks: knowledge silos → Mitigation: host recorded walkthrough for contributors. **Status:** Completed; see `.runs/4/2025-10-16T02-50-35Z/manifest.json` and `docs/TECH_SPEC.md` updates dated 2025-10-16.

### Learning Library Ingestion Flow (Update 2025-10-16)
1. Author new assets in `patterns/`, update `patterns/index.json`, and stage before/after examples in README tables.
2. Run `npm run build:patterns` and `npm test -- patterns`; attach logs to `.runs/<task>/<run>/` alongside `diff.patch`.
3. Record approvals and highlights in the run manifest, referencing the learning-library mini-spec (`tasks/specs/0003-learning-library.md`).
4. Notify the cloud-sync worker to mirror metadata into Codex Cloud learning catalogs; reviewer signs off using `patterns/templates/run-manifest-checklist.md`.

## Milestone M3 — Guardrails, CI, Evaluation Harness
- Objective: Lock guardrails in CI and prove orchestrator across sample repos with evaluation harness.
- Tasks:
  1. Reviewer — Prepare adapters/evaluation mini-spec (`tasks/specs/0004-adapters-evaluation.md`) and secure approval; Acceptance: spec registered with status `planned`→`done` and approvals recorded; Effort: 0.5 day; Risks: unclear adapter scope → Mitigation: review adapter catalog with platform leads.
  2. Builder — Implement `scripts/spec-guard.sh` and `.github/workflows/spec-guard.example.yml`; Acceptance: dry-run blocks missing/stale specs and CI workflow documented; Effort: 2 days; Risks: false positives → Mitigation: allow override flag with approval logging. **Status:** Completed; see `.runs/6/2025-10-16T18-19-14Z/manifest.json`.
  3. Tester — Develop evaluation harness in `evaluation/` applying learning assets to two open-source repos; Acceptance: `npm run eval:test` passes, results stored in `.runs/`; Effort: 3 days; Risks: fixture drift → Mitigation: version fixture snapshots and schedule refresh. **Status:** Completed; see `.runs/5/2025-10-16T18-52-00Z/` + `.runs/5/2025-10-16T18-59-30Z/`.
  4. Reviewer — Compile release notes and update `docs/ACTION_PLAN.md`, `docs/PRD.md`, `docs/TECH_SPEC.md` with final statuses; Acceptance: human-facing docs note completion metrics and approvals; Effort: 1 day; Risks: misaligned messaging → Mitigation: cross-check with state manifests before publication. **Status:** Completed 2025-10-16 — see `.runs/6/2025-10-16T18-49-34Z/manifest.json` for stakeholder approval, including spec guard, lint, and eval harness runs.
