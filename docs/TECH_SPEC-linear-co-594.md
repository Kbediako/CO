---
id: 20260617-linear-co-594
title: CO-594 consolidate Linear backlog and Ponytail refactor
relates_to: docs/PRD-linear-co-594.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
---

## Summary
- Objective: create a canonical CO-594 docs-first packet, run docs-review, then make the smallest behavior-preserving Ponytail refactor backed by subagent evidence and runnable validation.
- Scope: Linear provenance, Codex/OpenAI posture refresh, Ponytail audit, bounded implementation slices, required validation, review, and final integration.
- Constraints: no implementation edits before docs-review; no push/merge/destructive reset/bulk close; no new dependency/framework/package-manager migration.

## Issue-Shaping Contract
- User-request translation carried forward: consolidate accessible open CO/CO-orchestrator work into one canonical packet, preserve source issue provenance, then reduce bloat without behavior change.
- Protected terms / exact artifact and surface names: `CO-594`, `20260617-linear-co-594-co-594-consolidation`, `CO Control and Advisory`, `codex-cli 0.140.0`, `gpt-5.5`, `goals`, `multi_agent`, `in_app_browser`, `js_repl`, `docs-review`, `Ponytail full`.
- Nearby wrong interpretations to reject: completed `CO-588` is not active owner; blocked `CO-490` is not fixed; source issues are not bulk-closed; parent does not bypass subagents for substantive work.
- Explicit non-goals carried forward: no cloud environment repair, no broad backlog implementation, no public contract removal, no validation weakening.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Linear packet | `CO-594` exists and relates source issues. | Linear read inventory and `CO-594` description. | Tracked docs-first packet mirrors source inventory and provenance. | Bulk status changes. |
| Codex/OpenAI posture | Local smoke evidence is `codex-cli 0.140.0`; official latest model `gpt-5.5`. | `codex --version`, `codex features list`, OpenAI latest-model docs, and canonical CO-590 version policy. | Touched docs/specs preserve local `0.140.0` evidence without promoting canonical public posture beyond `0.135.0` unless policy is updated. | Repo-wide model migration or silent Codex CLI posture promotion. |
| Refactor | Candidate bloat unknown until audit. | Ponytail audit findings. | One small behavior-preserving simplification selected after docs-review. | Multi-system rewrite. |

## Readiness Gate
- Not done if: docs-review has not passed, source provenance is incomplete, subagent audit/planning evidence is missing, or implementation changes behavior without validation.
- Pre-implementation issue-quality review evidence: Linear connector was unavailable, then enabled; `CO` team, `CO Control and Advisory` project, open non-terminal issues, and new `CO-594` canonical issue were verified on 2026-06-17.
- Safeguard ownership split: parent owns final integration and decisions; subagents own inventory, posture, Ponytail audit, implementation stream, and validation/review streams.

## Technical Requirements
- Functional requirements:
  - Add CO-594 PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent/task` mirror, `tasks/index.json`, and `docs/TASKS.md` entries.
  - Preserve source issue identifiers, titles, links, statuses, assignees, priorities, labels, project membership, and rationale in the PRD source inventory table and Linear `CO-594`.
  - Run docs-review before implementation edits.
  - Run repo-wide Ponytail audit and choose bounded safe implementation slices.
  - Keep non-trivial logic covered by one runnable validation.
  - Run required checks scaled to touched surfaces.
- Non-functional requirements:
  - Keep diff small and reviewable.
  - Prefer deletion/shrink over abstraction.
  - Preserve security, data-loss protections, public contracts, and docs/review gates.
- Interfaces / contracts:
  - Linear connector issue/project/list APIs.
  - `codex --version`, `codex features list`.
  - OpenAI developer docs for latest-model guidance.
  - `codex-orchestrator start docs-review`.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current-facing Codex posture docs | Local `0.140.0` evidence is newer than canonical CO-590 `0.135.0` policy, but release-intake gates have not promoted it. | justify retaining fallback | CO-594 / CO-590 | Touched docs/specs discuss current CLI posture. | 2026-06-17 | 2026-06-17 | 30 days | A release-intake lane promotes `0.140.0`, or touched docs stop naming observed smoke as current adopted posture. | CLI feature commands and docs-review. |
| Delegation config TOML parsing | Missing `@iarna/toml` dependency triggered a custom subset parser fallback in `orchestrator/src/cli/config/delegationConfig.ts`. | remove fallback | CO-594 | Repo already declares `@iarna/toml`, and peer TOML consumers fail fast when it cannot load. | 2026-06-17 | 2026-06-17 | Immediate | Custom subset parser deleted; supported installs parse through declared dependency. | `npx vitest run --config vitest.config.core.ts orchestrator/tests/DelegationConfig.test.ts`; required checks. |
| Review wrapper command-intent recovery | Expired CO-485 legacy `sandbox_mode="read-only"` retry after `default_permissions=":read-only"` rejection. | remove fallback | CO-594 / CO-485 | `codex review` command-intent retry is blocked because the active CLI rejects `default_permissions`. | 2026-05-02 | 2026-06-17 | Expired 2026-06-01 | No third legacy sandbox retry is attempted; wrapper fails closed with no new `legacy_fallback_*` launch context while preserving the original command-intent termination boundary. | `npx vitest run --config vitest.config.core.ts tests/review-launch-attempt.spec.ts`; `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts`; final standalone review and pack smoke. |

- Contract name: local Codex posture evidence boundary.
- Owning surface: CO-594 docs packet and CO-590 version policy.
- Steady-state proof: touched docs distinguish observed local `0.140.0` smoke from canonical public `0.135.0` policy.
- Tests/docs: `codex --version`, `codex features list`, CO-594 docs-review, and CO-590 policy references.
- Non-expiring rationale: the posture boundary is a documented release-intake contract, not a temporary runtime fallback; promotion requires a separate release-intake lane.

## Architecture & Data
- Architecture / design adjustments: none before docs-review. Implementation must be a small deletion/shrink, not a new layer.
- Data model changes / migrations: none expected.
- External dependencies / integrations: Linear, OpenAI docs MCP, Codex CLI, multi-agent tools.

## Validation Plan
- Tests / checks:
  - `codex-orchestrator start docs-review --task 20260617-linear-co-594-co-594-consolidation-docs-review --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review` or `npm run review`
  - `npm run pack:smoke` if CLI/package/skills/review-wrapper surfaces are touched.
- Rollout verification: no push/merge; final local diff and validation evidence are reported only after terminal checks.
- Monitoring / alerts: long-running docs-review/review/checks are polled to terminal status.

## Implementation Notes
- Selected targets: delete the dependency-missing custom TOML subset fallback from `orchestrator/src/cli/config/delegationConfig.ts`; remove the expired CO-485 review-wrapper legacy sandbox retry.
- Owner decision: CO-594-owned fallback/seam removal. `orchestrator/src/cli/utils/delegationConfigParser.ts` remains out of scope because it preserves separate tolerated fallback config behavior.
- Focused validation: `npx vitest run --config vitest.config.core.ts orchestrator/tests/DelegationConfig.test.ts` passed with 18 tests; `npx vitest run --config vitest.config.core.ts tests/review-launch-attempt.spec.ts` passed with 20 tests; `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts` passed with 188 tests in the implementation worker lane.
- Final validation: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff-budget with explicit CO-579/CO-594 override, final standalone review, elegance recheck, and pack:smoke passed.

## Open Questions
- None.

## Approvals
- Docs-review: passed. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/manifest.json`.
- Standalone review: passed clean in enforce mode with a valid contract and 0 findings. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/review/telemetry.json`.
- Elegance review: passed after the telemetry classification fix. Evidence: subagent `019ed3d0-3c38-7801-a08c-fad3599a0b56`.
- Date: 2026-06-17.
