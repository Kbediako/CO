# Codex-Orchestrator Agent Handbook

## Purpose
This handbook orients Codex agents and human reviewers to the operational guardrails for Task 0001. It mirrors canonical guidance from `/tasks` and `.agent/` so day-to-day execution stays aligned with approved specs.

## Execution Modes & Approvals
- **Default mode:** `mcp` — deterministic local edits via `codex mcp-server`. Override with `--mode cloud` only when `tasks/tasks-0001-codex-orchestrator.md` marks a subtask `execution.parallel=true` _and_ the reviewer records the approval in the run manifest.
- **Approval policy:** Safe `read/edit/run/network`. Escalations require reviewer sign-off stored in `.runs/<task>/<timestamp>/manifest.json` under `approvals`.
- **Spec guard:** Run `bash scripts/spec-guard.sh --dry-run` before review and unblock merges only when specs touched in `src/**` or migrations have `last_review` ≤30 days.

## Build & Test Commands
| Command | When to use | Notes |
| --- | --- | --- |
| `npm run lint` | Pre-commit and review gates | Executes `npm run build:patterns` first to ensure codemods compile. |
| `npm run test` | Validates orchestrator unit/integration suites | Stores logs under `.runs` via tester agent. |
| `npm run eval:test` | Exercises evaluation harness scenarios | Requires seeded fixtures in `evaluation/fixtures/**`. |
| `npm run build:patterns` | After updating codemods, linters, templates | Builds TypeScript assets before publishing. |
| `node --loader ts-node/esm evaluation/harness/run-all.ts --mode=<mcp|cloud>` | Manual evaluation sweep | Persists scenario outputs to `.runs/<task>/<run>/evaluation/`. |

## MCP Registration Quick Start
1. Install the Codex CLI and authenticate with the approved workspace.
2. Run `scripts/run-local-mcp.sh` to spawn `codex mcp-server` with the repository mounted.
3. Confirm the builder agent can call `edit`, `git`, and `run` tools; attach resulting `diff.patch` and logs to the active run manifest.
4. For cloud overrides, configure `CODEX_MODE=cloud` and provide `CLOUD_WORKSPACE_ID` per the technical spec (§4 Integration Policy).

## External References
- **Canonical artifacts:** `/tasks/0001-prd-codex-orchestrator.md`, `/tasks/tasks-0001-codex-orchestrator.md`, `/tasks/specs/*`.
- **Mirrors:** `docs/PRD.md`, `docs/ACTION_PLAN.md`, `docs/TECH_SPEC.md` — keep these synchronized with the `/tasks` originals after every approval or milestone shift.
- **Learning assets:** `patterns/` (codemods, linters, templates) with metadata in `patterns/index.json`.
- **Evaluation harness:** `evaluation/` directory plus run instructions above; requires local `python3` for mixed-language scenarios.

## Run Artifact Expectations
- Store every command log, diff, and summary inside `.runs/<task>/<timestamp>/` following the manifest schema approved in `tasks/specs/0001-orchestrator-architecture.md`.
- Include `mode.selected`, validation status, and any escalations so the reviewer agent can verify guardrails without re-running commands.

Refer to `.agent/readme.md` for the operating loop and `.agent/SOPs/` for role-specific playbooks.
