# Action Plan - Delegation MCP Framing Compatibility Fix (Task 0944)

## Phase 0 — Preconditions
- Confirm current npm release (0.1.5) still fails MCP handshake with Codex CLI JSONL.
- Draft PRD/TECH_SPEC/ACTION_PLAN and task checklist for 0944.

## Phase 1 — Validation & Docs Review
- Run `npx codex-orchestrator start docs-review --format json --no-interactive --task 0944-delegation-mcp-framing-compat-fix`.
- Update mirrors (`tasks/`, `docs/`, `.agent/task/`) with manifest evidence.

## Phase 2 — Implementation (Test-first)
- Update MCP framing tests to assert JSONL responses for JSONL inputs.
- Adjust delegation server to emit JSONL responses when requests are JSONL.
- Run targeted tests (`orchestrator/tests/DelegationServer.test.ts`).

## Phase 3 — Full Guardrails
- Run release gate sequence:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." npm run review`

## Phase 4 — Release 0.1.6
- Update version to 0.1.6 in `package.json` + lockfile.
- Run `npm run clean:dist && npm run build`, `npm run pack:audit`, `npm run pack:smoke`.
- Tag + publish via release workflow:
  - `git tag -s v0.1.6 -m "v0.1.6"`
  - `git tag -v v0.1.6`
  - `git push origin v0.1.6`
- Monitor `.github/workflows/release.yml` and confirm GitHub Release notes.

## Phase 5 — Evidence + Mirrors
- Update `docs/TASKS.md`, `tasks/tasks-0944-delegation-mcp-framing-compat-fix.md`, `.agent/task/0944-delegation-mcp-framing-compat-fix.md` with manifest paths + release links.
- Update `tasks/index.json` gate metadata and docs freshness registry entries.

## Risks & Mitigations
- Risk: Framed clients regress if response framing changes incorrectly.
- Mitigation: Keep framed tests and add JSONL response tests; validate with real Codex CLI run.
