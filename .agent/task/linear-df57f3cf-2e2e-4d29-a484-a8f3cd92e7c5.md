# Agent Task Mirror - linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5

- Linear Issue: `CO-511` / `df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`
- Title: CO-511 docs:freshness:maintain packet for CO-102 rows
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- PRD: `docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- Checklist: `tasks/tasks-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`

## Current Truth
- The accepted child lane owned only the CO-511 packet files.
- Parent owns and has implemented owner metadata, registry mirrors, completed-lane source-spec reclassification, clean-main baseline proof, validation gate execution, PR lifecycle, workpad, and Linear state.
- Protected terms are `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, and validation gate.
- The packet rejects blind `last_review` bumps, docs freshness/spec-guard weakening, historical CO-102 packet deletion, and folding this into CO-507.

## CO-382 Fallback Decision Table
- Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-511 removes the stale active freshness seam for this completed-lane residue instead of adding another owner-routing branch.
- Minor-seam decision: remove the minor docs-freshness seam now by archiving or reclassifying the April 6 completed-lane rows under live CO-511 owner evidence.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Historical CO-102 packet rows with `last_review=2026-04-06` | `remove fallback` | CO-511 parent lane | Terminal owner replacement plus clean-main baseline validation gate | 2026-04-06 | 2026-05-07 | Removed on 2026-05-07 | Completed-lane packet/spec rows are archived or reclassified under live CO-511 owner evidence, with no retained fallback before handoff | Parent-owned `docs:freshness:maintain -- --format json`, `npm run docs:freshness`, and `node scripts/spec-guard.mjs --dry-run` |

## Guardrails
- The child lane must not edit `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`, or `tasks/index.json`.
- The child lane must not call Linear or GitHub mutation helpers.
- The child lane must not run full repo validation suites.
- Do not weaken freshness policy, spec-guard, or validation gate semantics.
- Do not delete or hide historical CO-102 packet rows.

## Not Done If
- Protected terms are missing from packet surfaces.
- CO-102 packet rows with `last_review=2026-04-06` are treated as deletion or blind-refresh targets.
- The clean-main baseline or validation gate is described as optional.
- CO-511 is folded into CO-507.
- Parent-owned metadata, registry, completed-lane reclassification, lifecycle, PR, or validation surfaces lack live CO-511 evidence.

## Validation Handoff
- Completed child-lane setup:
  - PRD
  - TECH_SPEC mirror
  - ACTION_PLAN
  - canonical task spec
  - task checklist
  - `.agent/task` mirror
- Parent-owned implementation:
  - imported patch artifact
  - updated registry and owner metadata
  - reclassified completed-lane source specs and packet rows without deletion or blind `last_review` churn
  - added completed-task timing where applicable
  - captured clean-main and validation gate proof
  - handles PR, review, workpad, and Linear lifecycle

## Evidence
- Source manifest: `.runs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5-co511-packet-docs/cli/2026-05-07T03-34-10-435Z-a35ba55b/manifest.json`
- Source anchor: `ctx:sha256:1998b27dfb57df81c7bce5beae2cce65c7f18b7398366940d62586fab83b5599#chunk:c000001`
- Source payload note: referenced payload path was absent in this child checkout.
