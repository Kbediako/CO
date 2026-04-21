# Task Checklist - linear-904f74a5-e1b6-4740-a0df-8c92ec73314b

- Linear Issue: `CO-268` / `904f74a5-e1b6-4740-a0df-8c92ec73314b`
- MCP Task ID: `linear-904f74a5-e1b6-4740-a0df-8c92ec73314b`
- Primary PRD: `docs/PRD-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- TECH_SPEC: `tasks/specs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`
- Shared source 0 anchor: `ctx:sha256:a55875599fbe621fd6a8da356298043a82116c53aa99ee0551cd826ab74cdd2e#chunk:c000001`
- Source object id: `sha256:a55875599fbe621fd6a8da356298043a82116c53aa99ee0551cd826ab74cdd2e`
- Origin manifest: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b/cli/2026-04-21T11-01-31-512Z-dfe5908b/manifest.json`

## Rework Reset
- [x] Previous PR `#568` feedback swept before new implementation. Evidence: CodeRabbit's two actionable comments were marked addressed in commit `5974350`; latest bot review was approved.
- [x] Previous PR `#568` closed for Rework reset. Evidence: `gh pr close 568`.
- [x] Previous Linear workpad deleted and fresh workpad created. Evidence: Linear workpad comment `13b6e0d5-9d3a-454b-b8ee-dd58e26c9cac`.
- [x] Fresh branch created from `origin/main`. Evidence: `linear/co-268-plugin-marketplace-0122-rebaseline-v2` at `1fcdaba8d`.

## Docs-First
- [x] PRD drafted for the `0.122.0` plugin marketplace command-surface rebaseline. Evidence: `docs/PRD-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, parity matrix, evidence, and validation plan. Evidence: `tasks/specs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`, `docs/TECH_SPEC-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] ACTION_PLAN drafted for reset, docs child lane, implementation, validation, and PR handoff. Evidence: `docs/ACTION_PLAN-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] Checklist mirrored to `.agent/task/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md`.
- [x] TECH_SPEC linked in `tasks/index.json`. Evidence: `tasks/index.json`.
- [x] Task snapshot and docs freshness registry mirrors updated. Evidence: `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review evidence captured before implementation. Evidence: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b-co268-docs-review-r2/cli/2026-04-21T11-13-51-089Z-419e9d6b/manifest.json`.

## Parallelization
- [x] Pre-turn decomposition matrix recorded in the Linear workpad.
- [x] `parallelize_now` / `independent_scope_available` decision recorded.
- [x] Same-issue child lane `public-docs-command-surface` completed and was accepted. Evidence: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b-public-docs-command-surface/cli/2026-04-21T11-06-07-564Z-1a36edbe/manifest.json`.

## Implementation Acceptance
- [x] Official `rust-v0.122.0` release fact and local `codex-cli 0.122.0` command-surface evidence captured.
- [x] Public docs use `codex plugin marketplace add` and `codex plugin marketplace remove codex-orchestrator` where applicable.
- [x] Launcher recovery guidance uses `codex plugin marketplace add`.
- [x] Pack-smoke prerequisite logic and invocation use the plugin marketplace command path.
- [x] Tests and smoke workflow pins reflect `@openai/codex@0.122.0`.
- [x] npm install path and existing CO-196 packaged marketplace architecture remain unchanged.
- [x] Explicit `CO-196` and posture-lineage linkage remains intact.

## Validation
- [x] `gh release view rust-v0.122.0 --repo openai/codex --json tagName,name,publishedAt,url,isDraft,isPrerelease`.
- [x] `codex --version`.
- [x] `codex marketplace add --help`.
- [x] `codex plugin marketplace add --help`.
- [x] `codex plugin marketplace remove --help`.
- [x] `npm run test:orchestrator -- tests/pack-smoke.spec.ts`.
- [x] Required repo gates from `AGENTS.md`.
- [x] Standalone review and elegance/minimality pass before PR handoff. Evidence: manifest-backed review ran with `FORCE_CODEX_REVIEW=1` but stalled/drifted without a usable verdict; manual review fallback fixed the stale version-policy finding and completed the minimality pass.
- [x] New PR attached to Linear and `pr ready-review` drain clean before review handoff. Evidence: PR `#577`; terminal ready-review result is recorded in the Linear workpad before state transition.

## Progress Log
- 2026-04-21: Rework reset completed from old PR/workpad into fresh branch `linear/co-268-plugin-marketplace-0122-rebaseline-v2`; parent recorded parallelization and launched public docs child lane while drafting the docs-first packet locally.
- 2026-04-21: Implementation and validation completed for the Codex 0.122 plugin marketplace command rebaseline; stale version-policy lineage found during review fallback was patched and full gates were rerun successfully.
- 2026-04-21: Replacement PR `#577` was attached to Linear; terminal ready-review proof is recorded in the Linear workpad before state transition to avoid committing stale post-push check timestamps.
