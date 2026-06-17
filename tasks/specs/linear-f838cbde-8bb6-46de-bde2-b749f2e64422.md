---
id: 20260426-linear-f838cbde-8bb6-46de-bde2-b749f2e64422
title: "CO: retire stale 0.124 evidence-book residue after Codex 0.125 adoption"
relates_to: docs/PRD-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md
risk: medium
owners:
  - Codex
last_review: 2026-06-17
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
related_action_plan: docs/ACTION_PLAN-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md
task_checklists:
  - tasks/tasks-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md
---

## Canonical Reference
- PRD: `docs/PRD-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- Task checklist: `tasks/tasks-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- Source anchor: `ctx:sha256:36aecdd1d31f000742d130136fe00806039121e7d92db144db5a9726604ea238#chunk:c000001`

## Summary
- Objective: retire the stale `0.124.0` evidence-book path as a current-facing surface while preserving CO-341/CO-345 evidence under explicit historical/archive status.
- Scope:
  - former docs/book/codex-cli-0124-adoption.md path and archived page status
  - `docs/book/README.md`, README links, and version-policy references that mention or route to the old evidence
  - posture matrix and docs catalog metadata
  - focused docs-hygiene coverage for the historical/archive path
- Constraints:
  - no runtime, workflow, package, or model target movement
  - no deletion-only remediation of the old evidence
  - no broad release-intake re-audit

## Issue-Shaping Contract
- User-request translation carried forward: CO-379 should remove confusing current-book residue from the old `0.124.0` adoption evidence while preserving the evidence and keeping current-facing docs aligned to Codex CLI `0.125.0` plus `gpt-5.5` / `xhigh` local ChatGPT-auth/appserver posture.
- Protected terms / exact artifact and surface names:
  - former docs/book/codex-cli-0124-adoption.md path
  - `CO-341`
  - `CO-345`
  - `Codex CLI 0.125.0`
  - `gpt-5.5` / `xhigh`
  - `gpt-5.4` fallback
  - `docs/book/README.md`
  - `docs/guides/codex-version-policy.md`
  - `docs/codex-posture-matrix.json`
  - `docs/docs-catalog.json`
  - `tests/docs-hygiene.spec.ts`
- Nearby wrong interpretations to reject:
  - treating `0.124.0` as current CO-local posture
  - deleting CO-341/CO-345 historical evidence
  - using this lane to change cloud-canary or release-facing workflow pins
  - broadening portable `gpt-5.4` fallback into current local posture
- Explicit non-goals carried forward:
  - no release target promotion or rollback
  - no package version change
  - no provider-supervision policy change
  - no external web release audit

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Old evidence page | Current `origin/main` entered the lane with the former docs/book/codex-cli-0124-adoption.md path; content said historical but filename and active book placement were confusing. | Historical evidence should remain accessible and clearly classified. | The evidence is under `docs/book/archive/codex-cli-0124-adoption.md`, with page text preserving CO-341/CO-345 evidence boundaries. | Removing evidence. |
| Navigation/index | `docs/book/README.md` links the old page and marks it historical. | Current navigation should foreground public posture and mark old evidence as historical/archive-only. | The link text and target path make historical/archive status impossible to miss. | Rewriting all book pages. |
| Current posture docs | README/version policy already carry `0.125.0`, `gpt-5.5` / `xhigh`, appserver, and `gpt-5.4` fallback wording. | CO-352/CO-355/CO-361/CO-364 established the split. | Current-facing surfaces continue to render that split and do not regress to `0.124.0`. | New posture validation. |
| Enforcement | Posture matrix and docs-hygiene can identify historical release evidence. | Renames/archive moves must keep matrix/catalog/test coverage coherent. | Focused docs-hygiene coverage passes for the new path and would still reject active stale release evidence. | Replacing docs-hygiene architecture. |

## Readiness Gate
- Not done if:
  - a current-facing docs path still implies `0.124.0` is current CO-local posture
  - old evidence is deleted instead of preserved
  - matrix/catalog metadata still points at the stale active-book filename after a move
  - focused docs-hygiene coverage is not updated or run
- Pre-implementation issue-quality review evidence:
  - 2026-04-26: issue-context confirmed CO-379 is `In Progress` with no attached PR and no prior workpad.
  - 2026-04-26: local `origin/main` initially contained the former docs/book/codex-cli-0124-adoption.md path, `docs/book/README.md`, `docs/codex-posture-matrix.json`, and current `0.125.0` posture docs.
- Safeguard ownership split:
  - Parent owns historical page rename/archive, docs packet, validation, Linear state, workpad, PR lifecycle, and final review.
  - Same-issue child lane owns the bounded index/README/version-policy audit until accepted, rejected, or invalidated.

## Technical Requirements
- Functional requirements:
  1. Preserve the `0.124.0` evidence body under a clearly historical/archive path or filename.
  2. Update current navigation and any current-facing links to the new historical/archive target.
  3. Update `docs/codex-posture-matrix.json` and `docs/docs-catalog.json` so the old evidence is historical/archive metadata, not active current guidance.
  4. Keep current posture prose at Codex CLI `0.125.0` plus `gpt-5.5` / `xhigh` for local ChatGPT-auth/appserver use.
  5. Keep `gpt-5.4` only as portable fallback wording where intentional.
  6. Adjust focused docs-hygiene coverage for the new historical/archive link target.
- Non-functional requirements:
  - minimal docs-only diff
  - deterministic local validation without network calls
  - no link rot from the page move
- Interfaces / contracts:
  - `docs/codex-posture-matrix.json` remains the posture contract for docs-hygiene.
  - `docs/docs-catalog.json` remains the catalog/freshness surface for book docs.
  - `tasks/index.json` registration stays under `items[]`.

## Architecture & Data
- Architecture / design adjustments: none beyond existing docs/catalog/test surfaces.
- Data model changes / migrations: historical evidence path changes in posture matrix and docs catalog if the page is moved.
- External dependencies / integrations: Linear workpad and provider-worker child-lane artifacts only.

## Validation Plan
- Tests / checks:
  - focused docs-hygiene coverage for the historical/archive path
  - focused repo search for stale active `codex-cli-0124-adoption.md` references
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
- Rollout verification:
  - workpad records child lane handling, validation, and review/elegance outcome before handoff
  - PR, if opened, is attached before review-state handoff
- Monitoring / alerts:
  - docs-hygiene remains the CI signal for stale active release evidence.

## Open Questions
- Resolved: parent chose `docs/book/archive/codex-cli-0124-adoption.md` because the `archive/` segment makes the evidence status clear while preserving nearby book navigation.

## Approvals
- Reviewer: Codex provider worker
- Date: 2026-04-26
