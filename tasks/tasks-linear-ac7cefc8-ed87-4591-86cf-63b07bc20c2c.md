# Task Checklist - linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c

- Linear Issue: `CO-330` / `ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- MCP Task ID: `linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- Primary PRD: `docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- TECH_SPEC: `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Parent manifest: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-co330-docs/cli/2026-04-23T13-50-23-422Z-4c9061c1/manifest.json`
- Source anchor: `ctx:sha256:dd72505af8602844d9a722f7d0cac31d98fe08f25d84adb745ed3f979b6c8cf8#chunk:c000001`

## Docs-First
- [x] Source payload availability checked in the parent workspace. Evidence: `../../.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c/cli/2026-04-23T13-47-24-915Z-37a8101f/memory/source-0/source.txt` exists and records provider-worker run metadata/provenance.
- [x] PRD drafted for CO-330 stale control-host owner reclaim and provider refresh retry recovery. Evidence: `docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, source provenance note, related-context boundary, and parent-owned implementation scope. Evidence: `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`, `docs/TECH_SPEC-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] ACTION_PLAN drafted for packet creation, parent source reconciliation, parent implementation, and scoped validation. Evidence: `docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] Task registration updated. Evidence: `tasks/index.json`.

## Protected Scope
- [x] Protected terms preserved. Evidence: PRD and canonical TECH_SPEC include `stale_control_host_owner`, `control-host`, `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, `fetch failed`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, `owner reclaim`, `provider refresh`, and `retry/resumable queue behavior`.
- [x] Wrong interpretations rejected. Evidence: PRD and canonical TECH_SPEC reject CO-41 ownership, CO-317-only admission/backfill, generic host restart workaround, and stdin bootstrap regression.
- [x] Related context bounded. Evidence: packet references CO-152 stale-owner ownership and CO-119 refresh-timeout recovery only as prior related context.

## Parent Implementation
- [x] Provider refresh failures now resolve the control-host run directory even when the POST fails before a successful response. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] `stale_control_host_owner` with `stale_reclaimed` now triggers one bounded provider refresh retry after rereading endpoint/auth artifacts for `fetch failed` or `refresh request timeout`. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Persistent failures now write `provider-control-host-refresh-failure.json` with failure kind, issue identity, owner status, retry attempts, and the ownership diagnostic payload. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Regression coverage proves both recovery and unrecovered diagnostic behavior. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.

## Validation
- [x] JSON parse check for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks index json ok')"` returned `tasks index json ok`.
- [x] Scoped diff review confirms no edits outside declared file scope. Evidence: `git diff --name-only` and `git status --short` showed only declared CO-330 packet paths plus `tasks/index.json`.
- [x] Same-issue docs child lane completed and parent accepted it. Evidence: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-co330-docs/cli/2026-04-23T13-50-23-422Z-4c9061c1/manifest.json`.
- [x] CO-330 commit isolated onto clean branch `linear/co-330-stale-owner-refresh-clean` from `origin/main`. Evidence: branch is ahead of `origin/main` by one commit and `git diff --name-only origin/main...HEAD` lists only the CO-330 packet, registry, source, and test paths.
- [x] `node scripts/spec-guard.mjs --dry-run` passed on the clean branch.
- [x] `npm run build` passed.
- [x] `npm run lint` passed with existing warnings only in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm test -- --run orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/ControlHostOwnership.test.ts` passed on clean branch after PR feedback fixes: 218 tests.
- [x] `npm run test` passed on clean branch after PR feedback fixes: 350 test files, 4685 tests.
- [x] `npm run docs:check` passed on clean branch.
- [x] `npm run docs:freshness` passed on clean branch after rebase: 4559 docs, 4562 registry entries, 0 stale.
- [x] `npm run repo:stewardship` passed on clean branch after rebase: 5673 tracked files, 0 action-required.
- [x] `npm run pack:smoke` passed.
- [x] Standalone review passed with `review_outcome=bounded-success` via command-intent retry and no actionable findings. Evidence: `../../.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c/cli/2026-04-23T13-47-24-915Z-37a8101f/review/telemetry.json`.
- [x] Elegance/minimality pass completed with no simplification patch needed; retry gating, diagnostic writing, and tests are already bounded to the CO-330 seam.

## Progress Log
- 2026-04-23: bounded same-issue docs child lane created the CO-330 docs-first packet and task registration only. Parent reconciled the source-0 payload after accepting the child patch; source-0 is run metadata/provenance, and Linear issue text remains the requirements source.
- 2026-04-23: parent implementation added one retry after stale-owner reclaim for provider refresh fetch/timeout failures and a persistent `provider-control-host-refresh-failure.json` diagnostic when retry cannot recover.
- 2026-04-23: parent added CO-330 docs freshness registry entries, isolated the work onto clean branch `linear/co-330-stale-owner-refresh-clean`, and restored docs gates to green on the clean branch.
- 2026-04-23: standalone review returned bounded success with no actionable findings; elegance pass found no simplification patch.

## Notes
- Do not edit source or tests in this child lane.
- Do not call Linear mutation helpers.
- Do not run full repo validation suites.
- Do not broaden CO-330 into CO-41, CO-317-only, generic host restart, or stdin bootstrap work.
