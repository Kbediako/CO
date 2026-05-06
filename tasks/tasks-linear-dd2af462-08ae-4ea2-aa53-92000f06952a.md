# Task Checklist - linear-dd2af462-08ae-4ea2-aa53-92000f06952a

- Linear Issue: `CO-455` / `dd2af462-08ae-4ea2-aa53-92000f06952a`
- MCP Task ID: `linear-dd2af462-08ae-4ea2-aa53-92000f06952a`
- Primary PRD: `docs/PRD-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- TECH_SPEC: `tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
- Shared source 0 anchor: `ctx:sha256:4c0a0f86311a384399aff1273a95e9e72eed60adf0127cd70616e736d4088164#chunk:c000001`
- Current origin manifest: `.runs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a-docs-packet/cli/2026-05-05T22-29-01-603Z-53a89036/manifest.json`
- Source payload note: supplied source payload contains run/source metadata rather than the full issue body; this packet is anchored on the explicit child-lane contract and protected terms.

## Docs-First
- [x] PRD drafted for attach timeout with healthy lower-authority evidence. Evidence: `docs/PRD-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, explicit non-goals, fallback/refactor decision, and parent-owned implementation seams. Evidence: `tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`, `docs/TECH_SPEC-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`.
- [x] `tasks/index.json` updated within the declared child-lane scope. Evidence: `tasks/index.json`.
- [x] Checklist mirrored to `.agent/task/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`. Evidence: `.agent/task/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`.
- [x] `docs/TASKS.md` updated with CO-455 snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for all packet/checklist paths. Evidence: `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs/checklist/registry file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear, GitHub, workpad, or PR lifecycle state. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] `co-status --format json` emits truthful degraded-read status for `control-host ui request timeout after 15000ms`. Evidence: `orchestrator/tests/CoStatusCliShell.test.ts` regression `falls back truthfully when a rotated endpoint times out but provider evidence advances`.
- [x] Healthy `provider-intake-state.json` and worker manifest heartbeats are retained as lower-authority diagnostic evidence. Evidence: the regression links a fresh provider-intake claim to a fresh worker manifest/proof and asserts no `active_worker_proof_missing` finding.
- [x] `/ui/data.json` timeout truth remains visible and no fabricated coherent status is produced. Evidence: the regression asserts `degraded_read.reason=ui_request_timeout` and source `local_seeded_runtime`.
- [x] Stale endpoint rotation is not triggered solely by the timeout when lower authority is healthy. Evidence: the regression rejects stale endpoint guidance in the rendered payload.
- [x] Stale control-host owner reclamation is not triggered solely by the timeout when lower authority is healthy. Evidence: the regression rejects stale control-host owner reclamation wording in the rendered payload.
- [x] Parent implementation rejects CO-459 stale `provider_intake` projection, CO-468 accepted no-run recovery, CO-407 direct JSON timeout budget, broad provider admission policy, and manual provider-intake artifact edits. Evidence: only `orchestrator/tests/CoStatusCliShell.test.ts` helper/test coverage changed; no source behavior or adjacent owner paths changed.

- Large-refactor check: not required while the existing attach/status read boundary can classify degraded-read timeout truth without broad provider admission or projection changes.
- Minor-seam decision: acceptable only as removal of the timeout-only stale endpoint or stale owner fallback; do not add a new fabricated status, compatibility, or break-glass path.

## Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Attach `/ui/data.json` read | `control-host ui request timeout after 15000ms` can be treated as stale endpoint or stale owner truth even when lower authority is healthy. | remove fallback | CO-455 parent lane | Attach UI read times out while `provider-intake-state.json` and worker manifest heartbeats remain healthy. | observed 2026-05-05 | 2026-05-05 | 0 days | Parent emits truthful degraded-read status and blocks timeout-only stale endpoint rotation or stale control-host owner reclamation. | Focused attach-timeout regression with healthy lower-authority evidence. |
| Lower-authority health evidence | `provider-intake-state.json` and worker manifest heartbeats support degraded-read diagnosis. | justify retaining fallback | CO-455 parent lane | `/ui/data.json` is unavailable but lower-authority evidence is fresh. | existing control-host observability contract | 2026-05-05 | Non-expiring diagnostic support | Replace only if a stronger unified health-read authority preserves degraded-read truth and source provenance. | Tests prove lower authority informs diagnosis without fabricated coherent status. |
| Stale endpoint rotation / stale control-host owner reclamation | Rotation or reclamation remains available for real stale/dead authority evidence. | justify retaining fallback | Control-host status owner | Endpoint or owner evidence is stale/dead, not merely slow. | existing control-host recovery contract | 2026-05-05 | Non-expiring recovery contract | Replace only with a better stale/dead endpoint and owner recovery mechanism. | Tests prove timeout-only healthy-lower-authority cases do not trigger these paths. |

## Validation
- [x] Child scoped JSON parse check for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8'));"`.
- [x] Child scoped JSON parse check for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8'));"`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "co-status --format json|control-host ui request timeout after 15000ms|provider-intake-state\\.json|worker manifest heartbeats|stale endpoint rotation|stale control-host owner reclamation|/ui/data\\.json|truthful degraded-read status|no fabricated coherent status|CO-459 stale provider_intake projection|CO-468 accepted no-run recovery|CO-407 direct JSON timeout budget|broad provider admission policy|manual provider-intake artifact edits" docs/PRD-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/TECH_SPEC-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/ACTION_PLAN-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/tasks-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md .agent/task/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/TECH_SPEC-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/ACTION_PLAN-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/tasks-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md .agent/task/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [x] Parent focused attach-timeout degraded-read regression. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusCliShell.test.ts` (29 tests passed).
- [x] Parent focused lower-authority health evidence regression. Evidence: same focused test asserts provider-intake selected claim freshness and worker proof projection.
- [x] Parent focused stale endpoint rotation / stale control-host owner reclamation non-trigger regression. Evidence: same focused test rejects stale endpoint and stale owner wording.
- [x] Parent CO-459, CO-468, CO-407, broad provider admission policy, and manual provider-intake artifact edit boundary proof. Evidence: final diff is docs packet plus `orchestrator/tests/CoStatusCliShell.test.ts`; no adjacent source or policy files changed.
- [x] Parent docs-review before implementation. Evidence: `linear child-stream --pipeline docs-review --stream docs-review`, run `2026-05-05T22-54-15-545Z-c9557e8b`, `review_outcome=clean-success`, manifest `.runs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a-docs-review/cli/2026-05-05T22-54-15-545Z-c9557e8b/manifest.json`.
- [x] Parent-selected scoped validation after source edits. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`; implementation-gate run `2026-05-05T22-59-54-688Z-cdd1a062` also succeeded with `review_outcome=clean-success`, manifest `.runs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a-implementation-gate/cli/2026-05-05T22-59-54-688Z-cdd1a062/manifest.json`.
- [x] Elegance/minimality pass completed after clean reviews. Evidence: removed unused local test type field and reran focused `CoStatusCliShell` suite (29 tests passed).

## Progress Log
- 2026-05-05: bounded same-issue child lane created the `CO-455` docs-first packet and checklist mirrors against source anchor `ctx:sha256:4c0a0f86311a384399aff1273a95e9e72eed60adf0127cd70616e736d4088164#chunk:c000001`. The supplied source payload contained run/source metadata rather than the full issue body, so the packet is anchored on protected child-lane wording. Protected terms include `co-status --format json`, `control-host ui request timeout after 15000ms`, `provider-intake-state.json`, worker manifest heartbeats, stale endpoint rotation, stale control-host owner reclamation, `/ui/data.json`, truthful degraded-read status, no fabricated coherent status, CO-459 stale `provider_intake` projection, CO-468 accepted no-run recovery, CO-407 direct JSON timeout budget, broad provider admission policy, and manual provider-intake artifact edits.
- 2026-05-05: parent accepted docs child lane `docs-packet`, added focused CO-455 regression coverage, verified current source behavior already recovers as truthful degraded-read status, ran local validation, clean `docs-review`, clean `implementation-gate`, and an elegance pass.
