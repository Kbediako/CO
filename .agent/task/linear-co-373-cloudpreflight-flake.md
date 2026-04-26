# Task Checklist - linear-co-373-cloudpreflight-flake

- Linear Issue: `CO-373`
- MCP Task ID: `linear-co-373-cloudpreflight-flake`
- Primary PRD: `docs/PRD-linear-co-373-cloudpreflight-flake.md`
- TECH_SPEC: `tasks/specs/linear-co-373-cloudpreflight-flake.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-co-373-cloudpreflight-flake.md`

## Docs-First
- [x] PRD drafted for `CO-373`. Evidence: `docs/PRD-linear-co-373-cloudpreflight-flake.md`.
- [x] TECH_SPEC drafted for `CO-373`. Evidence: `tasks/specs/linear-co-373-cloudpreflight-flake.md`, `docs/TECH_SPEC-linear-co-373-cloudpreflight-flake.md`.
- [x] ACTION_PLAN drafted for `CO-373`. Evidence: `docs/ACTION_PLAN-linear-co-373-cloudpreflight-flake.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-co-373-cloudpreflight-flake.md`. Evidence: `.agent/task/linear-co-373-cloudpreflight-flake.md`.
- [ ] Docs-review or documented fallback review completed before PR handoff.

## Investigation
- [x] CI failure evidence captured from PR #668 Core Lane and parent Tasks Archive Automation. Evidence: GitHub runs `24935665882` and `24935655330`.
- [x] Linear issue created and linked as blocking CO-361. Evidence: Linear `CO-373`.
- [x] Worker subagent reports the minimal CloudPreflight harness fix and root-cause notes. Evidence: worker lane summary identified the freshly written fake `codex` executable as the CI-flaky `--version` surface and kept product code unchanged.

## Implementation
- [x] Stabilize fake Codex CLI fixture behavior for cloud-list-focused tests. Evidence: `orchestrator/tests/CloudPreflight.test.ts`.
- [x] Preserve real `codex --version` unavailable classification. Evidence: existing synchronous spawn/unavailable regression coverage in `orchestrator/tests/CloudPreflight.test.ts`; `orchestrator/src/cli/utils/cloudPreflight.ts` unchanged.

## Validation
- [x] `npm run test:core -- orchestrator/tests/CloudPreflight.test.ts`. Evidence: 12 tests passed on 2026-04-25.
- [x] `CI=1 npm run test:core -- orchestrator/tests/CloudPreflight.test.ts`. Evidence: 12 tests passed on 2026-04-25.
- [x] `git diff --check`. Evidence: passed on 2026-04-25.
- [x] Repo-required guard/build/test/docs checks or explicit scoped waiver recorded. Evidence: `node scripts/spec-guard.mjs --dry-run` passed; delegation guard passed with explicit collab-subagent override; `npm run build` passed; `npm run lint` passed with pre-existing `DelegationMcpHealth.test.ts` warnings only; `npm run test` passed 352 files / 4827 tests; `npm run docs:check` passed; `npm run docs:freshness` passed; `npm run repo:stewardship` passed; `node scripts/diff-budget.mjs` passed.
- [x] Standalone review or bounded reviewer pass completed. Evidence: read-only validator subagent reported no P1/P2 blockers and confirmed production `codex_unavailable` behavior remains covered and unchanged.
- [ ] PR Core Lane passes.
- [ ] Archive PR #668 or replacement archive path is unblocked.

## Delivery
- [x] Open PR and attach evidence to Linear. Evidence: PR `#669` (`https://github.com/Kbediako/CO/pull/669`).
- [ ] Monitor all required checks to terminal status.
- [ ] Merge after green checks and no actionable review feedback.
- [ ] Mark CO-373 Done and resume CO-361 tag/release only after blocker evidence is green.
