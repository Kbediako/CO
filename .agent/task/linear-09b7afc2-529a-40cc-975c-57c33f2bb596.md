# Task Checklist - linear-09b7afc2-529a-40cc-975c-57c33f2bb596

- Linear Issue: `CO-339` / `09b7afc2-529a-40cc-975c-57c33f2bb596`
- MCP Task ID: `linear-09b7afc2-529a-40cc-975c-57c33f2bb596`
- Primary PRD: `docs/PRD-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`
- TECH_SPEC: `tasks/specs/linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`

## Docs-First
- [x] PRD drafted for the CO-339 release guide alignment lane. Evidence: `docs/PRD-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, readiness gate, and validation plan. Evidence: `tasks/specs/linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`, `docs/TECH_SPEC-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`.
- [x] ACTION_PLAN drafted for docs-review, target-doc patch, validation, review, and handoff. Evidence: `docs/ACTION_PLAN-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`.
- [x] Registry mirrors updated in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Task checklist and `.agent` mirror drafted. Evidence: `tasks/tasks-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`, `.agent/task/linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md`.
- [x] Parent docs-review evidence recorded. Evidence: `.runs/linear-09b7afc2-529a-40cc-975c-57c33f2bb596-co339-docs-review/cli/2026-04-23T19-16-05-343Z-5c84bf7e/manifest.json`, review output P2/P3 findings addressed before target-doc implementation.

## Evidence
- [x] Live Linear issue context inspected before state transition. Evidence: packaged `linear issue-context --issue-id 09b7afc2-529a-40cc-975c-57c33f2bb596`.
- [x] Issue moved from `Ready` to `In Progress` before active coding. Evidence: packaged `linear transition --state "In Progress"`.
- [x] Pre-turn decomposition matrix recorded and required parallelization decision logged. Evidence: Linear workpad plus packaged `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] Current `origin/main` workflow truth inspected after the provider snapshot proved stale. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main` plus workflow reads showing `@openai/codex@0.123.0`.

## Implementation
- [x] `docs/skills-release.md` states that Codex CLI `0.121.0` accepts both `codex marketplace add` and `codex plugin marketplace add`. Evidence: `docs/skills-release.md`.
- [x] `docs/skills-release.md` states that Codex CLI `0.122.0+` requires `codex plugin marketplace add`. Evidence: `docs/skills-release.md`.
- [x] `docs/skills-release.md` aligns release-facing `core-lane`, `release`, and `pack-smoke-backstop` wording to current `@openai/codex@0.123.0` workflow pins. Evidence: `docs/skills-release.md`.
- [x] `docs/skills-release.md` keeps `cloud-canary` distinct from release-facing `pack:smoke`. Evidence: `docs/skills-release.md`.

## Validation
- [x] Docs-review child stream recorded. Evidence: `.runs/linear-09b7afc2-529a-40cc-975c-57c33f2bb596-co339-docs-review/cli/2026-04-23T19-16-05-343Z-5c84bf7e/review/telemetry.json`.
- [x] Targeted grep confirms command-transition wording and absence of stale `@openai/codex@0.121.0` release-pin wording in `docs/skills-release.md`. Evidence: `rg -n '0\\.121\\.0|0\\.122\\.0\\+|0\\.123\\.0|codex marketplace add|codex plugin marketplace add|cloud-canary|pack:smoke' docs/skills-release.md` and stale-claim grep exited `1`.
- [x] Required repo validation floor passed. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `git diff --check`.
- [x] Standalone review first pass completed as bounded-success / command-intent with one P3; the freshness metadata finding was fixed. Evidence: `.runs/linear-09b7afc2-529a-40cc-975c-57c33f2bb596/cli/2026-04-23T19-07-44-903Z-c72602d3/review/telemetry.json`.
- [x] Post-fix validation passed. Evidence: `npm run docs:check`, `npm run docs:freshness`, and `node scripts/diff-budget.mjs`.
- [x] Standalone review rerun completed as bounded-success / command-intent with no actionable findings. Evidence: `.runs/linear-09b7afc2-529a-40cc-975c-57c33f2bb596/cli/2026-04-23T19-07-44-903Z-c72602d3/review/telemetry.json`.
- [x] Elegance review completed with no smaller truthful shape found.
- [x] `npm run pack:smoke` passed.

## Notes
- Current `origin/main` already contains the CO-337 workflow-pin truth: the release-facing downstream smoke workflows and `cloud-canary` install `@openai/codex@0.123.0`.
- This lane should not change workflow files, `pack:smoke`, or cloud-canary policy.
