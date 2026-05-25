---
id: 20260525-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9
title: "CO-557 provider docs-review task-key and control-host root drift"
relates_to: docs/PRD-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md
risk: high
owners:
  - Codex
last_review: 2026-05-25
related_action_plan: docs/ACTION_PLAN-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md
task_checklists:
  - tasks/tasks-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md
---

# TECH_SPEC - CO-557 provider docs-review task-key and control-host root drift

## Canonical Reference
- Linear issue: `CO-557` / `632b3471-6b55-4a0b-a778-0ca4001cf2b9`
- PRD: `docs/PRD-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md`
- Canonical task spec: `tasks/specs/linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md`
- Task checklist: `tasks/tasks-linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md`
- `.agent` mirror: `.agent/task/linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9.md`
- Source anchor: `ctx:sha256:f4fea3716bf1621b4ad87a2bef18062ebd0576374e9ee30a9bdfc122fd2d0bcb#chunk:c000001`
- Source object id: `sha256:f4fea3716bf1621b4ad87a2bef18062ebd0576374e9ee30a9bdfc122fd2d0bcb`
- Parent manifest pointer: `.runs/linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9-docs-packet/cli/2026-05-25T00-00-10-716Z-9e3f52b4/manifest.json`
- Source payload pointer: `.runs/linear-632b3471-6b55-4a0b-a778-0ca4001cf2b9-docs-packet/cli/2026-05-25T00-00-10-716Z-9e3f52b4/memory/source-0/source.txt`

## Summary
- Objective: make provider `docs-review` task-key selection and control-host artifact-root resolution explicit and fail-closed.
- Scope:
  - provider docs-review task-key authority
  - accepted child-lane manifest root resolution
  - shared control-host artifact root versus workspace-local `.runs`
  - `delegation-guard` registry/provenance validation for docs-review child streams
  - `provider-intake-state.json` as audit evidence, not a manual fix surface
  - narrow parent validation-blocker repair for `docs:check` task archive eligibility when `tasks/index.json` status is `done`
  - docs-only packet and registry mirrors in this child lane
- Constraints:
  - no source/test edits from this child lane
  - no Linear mutation helpers, GitHub/PR lifecycle, workpad mutation, or full repo validation
  - parent owns authoritative issue source, implementation, validation, Linear state, PR lifecycle, and review handoff

## Issue-Shaping Contract
- User-request translation carried forward: CO-557 must separate provider `docs-review` task-key proof from sibling child-lane keys and source-freshness recheck keys, then make control-host artifact root selection explicit so accepted child-lane manifest lookup, source-freshness evidence, and `provider-intake-state.json` audit reads do not drift between the shared control-host artifact root and workspace-local `.runs`.
- Protected terms / exact artifact and surface names:
  - `CO-515`
  - `CO-461`
  - `docs-review`
  - `delegation-guard`
  - `linear child-lane --action accept`
  - `linear child-stream --pipeline docs-review`
  - `linear-<uuid>-docs-packet`
  - `linear-<uuid>-source-freshness-recheck`
  - `tasks/index.json`
  - `provider-intake-state.json`
  - `shared control-host artifact root`
  - `workspace-local .runs`
  - `accepted child-lane manifest`
- Nearby wrong interpretations to reject:
  - treating `linear-<uuid>-docs-packet` as the docs-review parent task key
  - treating `linear-<uuid>-source-freshness-recheck` as docs-review proof
  - allowing docs-review children that have no registered parent task in `tasks/index.json`
  - accepting wrong-root artifacts as equivalent to the accepted child-lane manifest
  - editing `provider-intake-state.json` to paper over root drift
  - weakening `delegation-guard`
  - widening into CO-515 or CO-461 instead of preserving those lanes as reference contracts
- Explicit non-goals carried forward:
  - no source/test edits from this child lane
  - no Linear, workpad, GitHub, PR, or review lifecycle mutation
  - no full validation suite
  - no manual provider-intake repair
  - no broad provider-worker or docs-review redesign outside task-key/root authority
  - no docs/TASKS cap increase, reserve reduction, historical deletion, or task-index mass churn to bypass `docs:check`

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Provider docs-review task key | Docs-review task-key evidence can drift toward sibling child task names. | CO-461 requires sanctioned parent/child identity and strict `delegation-guard`. | Docs-review child stream uses registered parent task proof and a distinct docs-review child identity. | Arbitrary task-id allowlists or broad guard relaxation. |
| Docs packet child lane | `linear-<uuid>-docs-packet` is valid packet-production evidence. | Child-lane docs packets are patch artifacts for parent acceptance. | Packet child key remains evidence for packet import, not docs-review task-key proof. | Treating packet production as implementation review success. |
| Source freshness recheck | `linear-<uuid>-source-freshness-recheck` is related control-host source evidence. | CO-515 source freshness rechecks guard current source-root truth. | Source-freshness recheck remains separately classified and cannot satisfy docs-review proof. | Reopening CO-515 source freshness semantics. |
| Artifact root | Shared control-host artifact root and workspace-local `.runs` can be conflated. | Accepted artifacts should resolve from the root that produced or accepted them. | Root selection is explicit, recorded, and wrong-root resolution fails closed. | Moving/deleting historical artifacts. |
| Accepted child-lane manifest | Acceptance can become ambiguous if manifest lookup uses the wrong root. | `linear child-lane --action accept` should preserve accepted manifest proof. | Accepted child-lane manifest path and root are carried through diagnostics and validation. | Child lane committing or mutating parent-owned state. |
| Provider intake audit | `provider-intake-state.json` can expose task-key/root drift. | Audit history should remain visible. | Parent changes authority resolution or diagnostics while preserving provider-intake history. | Manual provider-intake edit, deletion, or history rewrite. |

## Readiness Gate
- Not done if:
  - any protected term is missing from the packet
  - docs-review task-key can still resolve to `linear-<uuid>-docs-packet`
  - docs-review task-key can still resolve to `linear-<uuid>-source-freshness-recheck`
  - provider docs-review child streams pass without registered parent task proof in `tasks/index.json`
  - accepted child-lane manifest lookup can succeed from the wrong root
  - stale or foreign `workspace_path` metadata can route `provider-intake-state.json` lookup outside the current checkout
  - shared control-host artifact root and workspace-local `.runs` remain implicit or interchangeable
  - `provider-intake-state.json` is manually changed as the fix
  - `docs:check` is made green by weakening docs/TASKS reserve policy instead of fixing task archive eligibility for terminal `done` rows
  - this child lane edits outside declared docs file scope
- Pre-implementation issue-quality review evidence:
  - 2026-05-25: packet is not narrower than the user request because it carries both requested surfaces, protected issue terms, sibling wrong-task-key cases, root-drift cases, non-goals, and parent-owned validation requirements.
  - 2026-05-25: micro-task path is unavailable because correctness depends on exact task-key names, exact artifact-root surfaces, and fallback/seam behavior.
- Safeguard ownership split:
  - parent lane owns source inspection, implementation, tests, validation, Linear/workpad state, PR lifecycle, and review handoff
  - this child lane owns only the declared docs packet and registry mirror files

## Technical Requirements
- Functional requirements:
  1. Resolve provider docs-review task keys from the registered parent task in `tasks/index.json`, not from `linear-<uuid>-docs-packet` or `linear-<uuid>-source-freshness-recheck`.
  2. Keep `linear child-stream --pipeline docs-review` tied to sanctioned provider parent proof and `delegation-guard` acceptance.
  3. Preserve `linear child-lane --action accept` proof by naming the accepted child-lane manifest path and root.
  4. Make shared control-host artifact root versus workspace-local `.runs` selection explicit in provider/root diagnostics.
  5. Fail closed when docs-review evidence, accepted child-lane manifest lookup, or source-freshness recheck lookup resolves through the wrong root.
  6. Preserve `provider-intake-state.json` as audit evidence and avoid manual mutation as a fix.
  7. Keep CO-515 and CO-461 as reference contracts, not widened parent scope.
  8. Preserve `docs:check` reserve enforcement by treating `tasks/index.json` status `done` as terminal archive eligibility only when the snapshot also has terminal evidence or an explicit completion date.
- Non-functional requirements:
  - diagnostics should name the observed task key, expected parent task key, selected artifact root, and rejected root when useful
  - changes should be narrow to provider docs-review task-key/root authority
  - validation-blocker fixes should be narrow, root-cause, and keep strict docs gates intact
  - fail-closed behavior must be covered before any success-path expansion
- Interfaces / contracts:
  - `linear child-stream --pipeline docs-review`
  - `linear child-lane --action accept`
  - `delegation-guard`
  - `tasks/index.json`
  - `provider-intake-state.json`
  - shared control-host artifact root
  - workspace-local `.runs`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider docs-review task key | Docs-review task identity can be inferred from sibling child keys such as `linear-<uuid>-docs-packet` or `linear-<uuid>-source-freshness-recheck`. | expire fallback | CO-557 parent implementation | Provider docs-review launch or validation. | 2026-05-25 | 2026-05-25 | 2026-06-24 | Docs-review task key derives from registered parent task plus sanctioned child-stream proof. | Focused docs-review task-key and `delegation-guard` regressions. |
| Control-host artifact root | Artifact lookup can implicitly choose shared control-host artifact root or workspace-local `.runs`. | expire fallback | CO-557 parent implementation | Provider reads accepted child-lane manifest, source-freshness recheck, or provider-intake audit evidence. | 2026-05-25 | 2026-05-25 | 2026-06-24 | Root selection is explicit, diagnostics name the root, and wrong-root lookup fails closed. | Focused root-resolution and manifest-acceptance regressions. |
| Strict provider task registration and provenance | Contract name: registered parent task plus sanctioned provider child proof. | justify retaining fallback | Owning surface: `delegation-guard` and provider child-stream contract | Provider docs-review validation. | 2026-05-25 | 2026-05-25 | Non-expiring durable retention only with rationale | Non-expiring rationale: strict registry/provenance validation is correctness behavior. | Missing registry proof, wrong task key, and wrong-root artifact cases fail closed. |

- Large refactor: scoped authority repair is acceptable only if parent source inspection keeps the fix within existing child-stream, child-lane accept, and artifact resolver seams. If root authority is split across lifecycle phases, parent should relaunch with widened ownership rather than adding another minor seam.
- Minor seam: no new minor seam is retained; the existing implicit task-key/root inference seam is expired by fail-closed authority checks.

Durable retention evidence:
- Contract name: registered parent task plus sanctioned provider child proof.
- Owning surface: `delegation-guard` and provider child-stream contract.
- Steady-state proof: missing registry proof, wrong task key, and wrong-root artifact cases fail closed.
- Tests/docs: `tests/delegation-guard.spec.ts`, `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`, and this CO-557 packet.
- Non-expiring rationale: strict registry/provenance validation is correctness behavior, not temporary fallback.

## Architecture & Data
- Architecture / design adjustments:
  - inspect provider docs-review launch/task-key construction
  - inspect child-lane accept proof and accepted child-lane manifest lookup
  - inspect control-host artifact root resolver and workspace-local `.runs` fallback behavior
  - inspect `delegation-guard` task registry/provenance checks for docs-review children
  - inspect provider-intake audit read paths without mutating `provider-intake-state.json`
- Data model changes / migrations:
  - no migration expected in this child lane
  - parent may need to persist selected artifact root and expected task key in manifest or diagnostics if not already present
- External dependencies / integrations:
  - provider worker manifests and child-stream manifests
  - control-host artifact root
  - task registry and docs freshness registry
  - docs/TASKS archive policy and task archive script

## Validation Plan
- Child-lane checks:
  - protected-term scan across declared CO-557 files
  - scoped markdown trailing-whitespace scan
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - changed-file scope check limited to declared files
- Parent-owned focused checks:
  - docs-review child stream uses the registered parent task key
  - docs-review does not accept `linear-<uuid>-docs-packet` as the task key
  - docs-review does not accept `linear-<uuid>-source-freshness-recheck` as the task key
  - `delegation-guard` accepts sanctioned docs-review parent/child proof and rejects missing registry proof
  - accepted child-lane manifest lookup succeeds only from the authoritative root
  - wrong-root shared control-host artifact root versus workspace-local `.runs` lookup fails closed with actionable diagnostics
  - stale or foreign active-manifest `workspace_path` cannot make `delegation-guard` accept provider-intake proof from another clone
  - `provider-intake-state.json` audit history remains visible and unmutated
  - CO-515 and CO-461 reference behavior remains covered by focused regressions or existing tests
  - `tasks-archive` regression proves terminal snapshots with `tasks/index.json` status `done` are archive-eligible
  - `docs:archive-tasks` restores configured `docs/TASKS.md` reserve without changing the policy cap
- Parent-owned broader checks:
  - docs-review before implementation as required by parent workflow
  - implementation gate, review, and lifecycle handoff after source/test changes

## Open Questions
- Parent must identify the exact source seam that currently derives the docs-review task key.
- Parent must confirm whether artifact-root authority should be carried by manifest metadata, child-lane acceptance records, or control-host runtime configuration.

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-25
