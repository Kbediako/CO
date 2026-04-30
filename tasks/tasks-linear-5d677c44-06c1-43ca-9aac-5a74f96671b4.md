# Task Checklist - linear-5d677c44-06c1-43ca-9aac-5a74f96671b4

- Linear Issue: `CO-431` / `5d677c44-06c1-43ca-9aac-5a74f96671b4`
- MCP Task ID: `linear-5d677c44-06c1-43ca-9aac-5a74f96671b4`
- Primary PRD: `docs/PRD-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- TECH_SPEC: `tasks/specs/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- Agent mirror: `.agent/task/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`
- Source anchor: `ctx:sha256:6ea763de1cb1d0b142323efe474f2c99ec0b6bf6c71fd265c1b4df04d2521dfd#chunk:c000001`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Docs-First Packet
- [x] PRD drafted for CO-431. Evidence: `docs/PRD-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`.
- [x] Canonical TECH_SPEC drafted with protected terms, parity matrix, route requirements, and validation contract. Evidence: `tasks/specs/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`.
- [x] Docs TECH_SPEC mirror drafted. Evidence: `docs/TECH_SPEC-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`.
- [x] Agent task mirror drafted. Evidence: `.agent/task/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md`.
- [x] Parent integrates packet into task index, docs task snapshot, and docs freshness registry if needed. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Required Implementation Outcomes
- [x] `docs:freshness:maintain` verifies live owner state by exact `canonical_owner_key` / marker before selecting an owner action. Evidence: `scripts/docs-freshness-maintain.mjs`, `tests/docs-freshness-maintain.spec.ts`.
- [x] `CO-428` stale active-spec recurrence routes to distinct action evidence. Evidence: `tests/docs-freshness-maintain.spec.ts`.
- [x] `CO-429` completed-lane registry residue routes to distinct action evidence. Evidence: `tests/docs-freshness-maintain.spec.ts`.
- [x] `CO-430` terminal-owner replacement routes to distinct action evidence and does not reopen/reuse terminal issues. Evidence: `tests/docs-freshness-maintain.spec.ts`.
- [x] Create/update/noop/replacement action evidence includes owner state, route reason, exact marker, and sample/copyable bodies. Evidence: `scripts/docs-freshness-maintain.mjs`.
- [x] Dry-run and no-token modes emit copyable issue/comment/update bodies without mutation. Evidence: `tests/docs-freshness-maintain.spec.ts`.
- [x] Scheduled maintenance and provider-worker preflight paths consume the same maintenance decision schema. Evidence: `.github/workflows/docs-truthfulness-weekly.yml`.
- [x] CO-188 and CO-323 remain cited as escaped historical root-cause attempts. Evidence: `scripts/docs-freshness-maintain.mjs`, `docs/guides/docs-freshness-cohorts.md`.

## Focused Validation
- [x] Focused route tests for `CO-428`, `CO-429`, and `CO-430`. Evidence: `npx vitest run tests/docs-freshness-maintain.spec.ts --config vitest.config.core.ts`.
- [x] Focused owner-state tests for open owner update/noop, missing owner create, terminal owner replacement, and mismatched marker failure. Evidence: `npx vitest run tests/docs-freshness-maintain.spec.ts --config vitest.config.core.ts`.
- [x] Focused dry-run/no-token tests for no mutation plus copyable body output. Evidence: `npx vitest run tests/docs-freshness-maintain.spec.ts --config vitest.config.core.ts`.
- [x] Focused scheduled/preflight wiring tests. Evidence: workflow summary Node block syntax check plus focused maintenance tests.
- [x] Parent-owned validation floor after implementation import. Evidence: delegation guard, spec guard, build, lint, full test, docs:check, docs:freshness, docs:freshness:maintain, repo stewardship, git diff --check, and diff-budget override passed.
- [x] Manifest-backed standalone review rerun after P2 fixes completed with `review_outcome=bounded-success`. Evidence: `.runs/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4/cli/2026-04-30T11-03-00-861Z-82d9d979/review/telemetry.json`.
- [x] Explicit elegance/minimality pass found no simplification patch. Evidence: `out/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4/manual/elegance-review.md`.

## Child Lane Validation
- [x] `git diff --check -- <declared CO-431 packet files>` passed locally.
- [x] Protected-term `rg` over the declared packet files confirmed coverage for `CO-431`, `CO-428`, `CO-429`, `CO-430`, `CO-188`, `CO-323`, `docs:freshness:maintain`, `canonical_owner_key`, `canonical_owner_marker`, dry-run/no-token, scheduled/preflight, stale active-spec, completed-lane registry residue, and terminal-owner replacement.
- [x] `LC_ALL=C rg -n "[^\x00-\x7F]" <declared CO-431 packet files>` returned no matches.

## Notes
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`.
- Do not perform Linear, GitHub, PR, workpad, or lifecycle mutations from this docs-only child lane.
- Do not treat CO-188 or CO-323 as proof that canonical-owner recurrence routing is already closed.
