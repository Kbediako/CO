# ACTION_PLAN - CO: classify long-lived parent-session delegate-server children with bounded observability

## Traceability
- Linear issue: `CO-213` / `975669a4-3804-4b5b-9a7b-e1b7c77d3926`
- Related issue: `CO-168`
- Shared source 0 anchor: `ctx:sha256:9365537032610f4c18c808abb19252eb18f9523a66a1087cac046836dfa7662d#chunk:c000001`
- Parent workspace: `/Users/kbediako/Code/CO/.workspaces/linear-975669a4-3804-4b5b-9a7b-e1b7c77d3926`

## Summary
- Goal: finish `CO-213` by adding bounded observability and safe recovery for long-lived still-parented `delegate-server` children under top-level Codex parent sessions, while staying narrower than `CO-168`.
- Scope: child-lane docs packet authoring, parent-owned packet registration/docs-review, smallest runtime/doctor classification change, focused regressions, and later review handoff.
- Assumptions:
  - the active host is macOS/Unix and supports bounded local `ps` inspection
  - existing `.runs/**` manifests and runner logs are sufficient to infer associated manifest and process-tree role for many active sessions
  - `idle` should stay advisory unless stronger evidence promotes it to `stale`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `delegate-server`, `long-lived top-level Codex parent session`, `parent PID`, `cwd`, `RSS`, `active issue-worker/review/child-lane process tree`, `associated manifest`, and `stale or idle classification`
  - reject reopening `CO-168` transport/setup/startup work, age-only cleanup of parented children, and generic control-host cleanup drift
- Not done if:
  - parented leftovers still remain forever `active`
  - the eventual observability surface still omits parent/session/manifest context
  - active worker/review/child-lane chains become cleanup candidates
- Pre-implementation issue-quality review:
  - current workpad and repo truth already narrow this issue to still-parented stale children plus observability
  - current code only exposes aggregate active/stale counts, stale PID lists, and stale RSS

## Milestones & Sequencing
1. Child lane authors the docs-first packet only in the scoped packet files.
2. Parent imports this patch, updates `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`, then records docs-review evidence or truthful fallback.
3. Parent audits current `delegationMcpHealth` / `doctor` behavior against the `CO-213` observability contract and confirms the narrowest implementation seam.
4. Parent implements the smallest classification model that distinguishes `active`, `idle`, and `stale` parent-session `delegate-server` children while preserving `CO-168` orphan handling.
5. Parent wires per-process observability so doctor or another bounded surface reports parent PID, cwd, age, RSS, associated manifest, and active tree role.
6. Parent keeps recovery bounded: active issue-worker/review/child-lane trees remain protected; `idle` stays advisory unless stronger evidence appears; only proven `stale` leftovers become cleanup candidates.
7. Parent runs focused tests, live/manual verification, standalone review, and the required validation floor before review handoff.

## Dependencies
- `orchestrator/src/cli/utils/delegationMcpHealth.ts`
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/delegationCliShell.ts`
- `.runs/**/manifest.json`
- `.runs/**/runner.ndjson`

## Validation
- Checks / tests:
  - parent-owned docs-review after packet import
  - `npx vitest run orchestrator/tests/DelegationMcpHealth.test.ts orchestrator/tests/Doctor.test.ts`
  - any new focused helper tests required by the chosen manifest-correlation seam
  - targeted doctor verification, preferably `node dist/bin/codex-orchestrator.js doctor --format json` or the equivalent repo-supported shell, against a long-lived top-level Codex parent session
  - parent-owned validation floor before review handoff
- Rollback plan:
  - revert the parent-session classification slice and keep the current `CO-168` orphan-only behavior if active chains are misclassified or cleanup guidance becomes unsafe
  - keep the issue active until observability truthfully distinguishes active vs idle/stale parented children

## Risks & Mitigations
- Risk: manifest association is ambiguous or wrong for some parented children.
  - Mitigation: fail closed, keep uncertain records advisory, and surface missing-correlation detail instead of broadening cleanup.
- Risk: recovery guidance accidentally targets active delegated work.
  - Mitigation: keep `idle` advisory by default and require stronger stale evidence before any apply path.
- Risk: implementation drifts back into `CO-168` transport/setup work.
  - Mitigation: keep the touched implementation seam limited to lifecycle classification, observability, and bounded recovery output.
- Risk: scanning `.runs/**` becomes too broad or slow.
  - Mitigation: bound correlation to the active workspace and relevant recent manifests first, then stop at the first defensible match.

## Approvals
- Reviewer: pending parent review and docs-review.
- Date: 2026-04-17
- Evidence: child-lane packet authored in scoped docs files only; registry and validation evidence remain parent-owned.
