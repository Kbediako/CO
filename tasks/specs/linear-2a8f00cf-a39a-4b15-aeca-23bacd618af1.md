---
id: 20260416-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1
title: CO Codex CLI 0.121.0 Sandbox/Security Preflight Policy Classification
status: done
owner: Codex
created: 2026-04-16
last_review: 2026-05-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md
related_action_plan: docs/ACTION_PLAN-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md
related_tasks:
  - tasks/tasks-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md
review_notes:
  - 2026-04-16: Issue-quality review approves CO-199 as a docs-first classification lane. The lane must preserve protected terms, classify 0.121 sandbox/security deltas into local-only/cloud-only/both/not-applicable, and reject credential/profile rotation fixes, sandbox default weakening, and broad cloud runtime redesign.
  - 2026-05-17: CO-543 strict spec-guard audit reclassified this stale Apr 16 row inactive done; live Linear evidence verified CO-199 is Done/completed. No completed_at was inferred or fabricated.
---

## CO-382 Fallback Decision Table
- Large-refactor check: no new fallback mechanism or guard split is warranted; CO-543 removes lifecycle metadata drift while keeping the existing strict spec-guard and docs-freshness ownership surfaces authoritative.
- Minor-seam decision: the bounded seam is acceptable because completed packet rows are reclassified inactive or archived with evidence, and future active specs surface through the existing docs-freshness-maintain owner-action route before hard expiry.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active spec lifecycle freshness | Completed task/spec packet rows remained active and recurred as stale spec-guard debt | remove fallback | CO-543 | Apr 16 terminal packet rows reached the 30-day strict spec-guard boundary | 2026-04-16 | 2026-05-17 | N/A after removal | Completed rows are inactive done; related terminal packet registry rows are archived; future active specs surface pre-expiry owner action | node scripts/spec-guard.mjs; npm run docs:check; focused docs-freshness/spec-guard tests; diff-budget override |

# Technical Specification

## Context
CO-195 audited Codex CLI `0.121.0`, held active adoption at `0.118.0`, and recorded the required cloud canary blocker as missing `CODEX_CLOUD_ENV_ID`. CO-199 narrows to the remaining sandbox/security interpretation gap: Codex 0.121 release notes include local platform sandbox fixes, cloud-preflight-adjacent messaging, and shared app-server/MCP/exec-server surfaces that need explicit local-cloud classification before any policy implementation.

## Requirements
1. Register the docs-first packet for CO-199.
2. Preserve the protected terms and exact surfaces named by the parent prompt.
3. Classify each relevant 0.121 sandbox/security delta as `local-only`, `cloud-only`, `both`, or `not applicable`.
4. Keep local platform sandbox changes out of cloud promotion blockers unless parent evidence proves cloud impact.
5. Keep cloud preflight messaging distinct from local sandbox defaults.
6. Preserve CO-195's hold posture until required cloud evidence exists.
7. Define parent validation without running full validation in this child lane.

## Issue-Shaping Contract
Protected terms: CO-199, Codex CLI `0.121.0`, Codex CLI `0.118.0`, `rust-v0.121.0`, `CODEX_CLOUD_ENV_ID`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `danger-full-access`, macOS sandbox, private DNS, Unix socket allowlists, secure devcontainer profile, bubblewrap, WSL1 bubblewrap limitations, WSL2 behavior, MCP sandbox-state metadata, exec-server filesystem sandbox helper, app-server filesystem metadata, `thread/shellCommand`.

Wrong interpretations rejected: local-only sandbox details as cloud blockers, cloud-only failure messaging as local runtime policy, sandbox default weakening, credential/profile rotation fixes, broad cloud runtime redesign, marketplace/plugin packaging adoption, and provider-worker appserver migration.

Explicit non-goals carried forward: no credential/profile rotation fixes, no sandbox default weakening, no broad cloud runtime redesign, no marketplace packaging, no MCP Apps authority expansion, no appserver provider-worker migration.

## Parity / Alignment Matrix
- Current truth: CO active target remains `0.118.0`; `0.121.0` is the latest audited candidate but not promoted.
- Reference truth: `rust-v0.121.0` includes sandbox/security-adjacent release deltas that affect local, cloud, both, or neither preflight policy surfaces.
- Target truth: CO-199 parent implementation uses an explicit classification table before changing policy/docs/tests.
- Out-of-scope differences: credential/profile rotation, sandbox defaults, cloud runtime architecture, marketplace support, provider-worker appserver supervision.

## Readiness Gate
- Not done if: classification rows are missing; classes are collapsed into generic "sandbox/security"; local-only changes block cloud without cloud evidence; cloud-only blockers change local sandbox defaults; parent implementation touches broad runtime or credential surfaces.
- Pre-implementation issue-quality review evidence: this task spec records the issue-shaping contract, parity matrix, protected terms, non-goals, and validation plan.
- Safeguard ownership split: child lane owned only the listed docs/register files; parent owns source-0 reconciliation, implementation, Linear state, workpad, PR, and full validation.

## Technical Requirements
- Functional requirements: docs-first packet, registry mirrors, preliminary classification matrix, parent validation checklist.
- Non-functional requirements: concise docs, no secret exposure, no sandbox default weakening, no broad suite execution in child lane.
- Interfaces / contracts: CO docs-first registry, docs freshness registry, cloud preflight policy docs, Codex release-note source, parent workpad.

## Architecture & Data
- Architecture / design adjustments: none in child lane. Parent should prefer existing preflight/policy helpers and docs catalog checks if implementation is required.
- Data model changes / migrations: none.
- External dependencies / integrations: official Codex release notes (`https://github.com/openai/codex/releases/tag/rust-v0.121.0`), CO-195 packet, parent `.runs/.../source-0/source.txt` reconciled as metadata-only prompt provenance, Linear/GitHub through parent lane only.

## Validation Plan
- Tests / checks:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - exact CO-199 target path presence check
  - registry path presence check
- Rollout verification: parent should run docs-review before implementation and record source-0 reconciliation plus the final classification matrix.
- Monitoring / alerts: parent PR checks and ready-review drain only.

## Open Questions
- Parent source-0 reconciliation found only run metadata and prompt-pack provenance, with no additional sandbox/security classification rows.
- Secure devcontainer behavior stays local-only for current CO preflight policy because no cloud image dependency evidence is present.
- `thread/shellCommand` remains local-only and outside the default provider-worker authority model unless a future cloud-bridge lane proves exposure.

## Approvals
- Reviewer: child-lane self-review for packet shape; parent docs-review pending.
- Date: 2026-04-16
