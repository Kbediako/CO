# PRD - CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- Linear URL: https://linear.app/asabeko/issue/CO-88/co-repo-wide-cleanup-of-stale-compatibility-debt-contradictory-docs
- Source issue: `CO-77` / `da28812d-8367-4d94-a273-d0652535f818`

## Summary
- Problem Statement: the repo still carries a cluster of stale or contradictory surfaces that were acceptable as intermediate compatibility seams but are now misleading. Historical docs and task packets still describe a removed legacy selected-run presenter module as the `/ui/data.json` authority even though the current control-host truth is centered on `uiDataController.ts`, `operatorDashboardPresenter.ts`, and newer compatibility/read-model seams; uppercase legacy task templates still coexist with `.agent/task/templates/*`; `scripts/lib/review-launch-attempt.ts` and `scripts/run-review.ts` still carry compatibility-era retry and fallback behavior whose live necessity is under-explained; `packages/design-system` and nearby design-reference task/docs still overstate delivered toolkit or regression capability; `packages/sdk-node/src/orchestrator.ts` still exposes compatibility artifact paths whose lifetime was not durable under the caller; and stale archive, instruction, and demo surfaces such as the old MCP code-mode report, `docs/AGENTS.md`, `.agent/AGENTS.md`, and `packages/orchestrator-status-ui/app.js` still tell older stories.
- Desired Outcome: land one integrated cleanup pass that removes dead compatibility surfaces where possible, records explicit rationale where a compatibility seam must remain, and updates the surrounding docs/specs/tasks/instructions in the same lane so the repo's public and internal surfaces all tell the truth together.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat this as a repo-wide truthfulness and contradiction-reduction lane, not as a narrow bugfix or docs-only wording pass. The cleanup needs to collapse stale compatibility debt, placeholder package claims, contradictory persistence/runtime docs, and historical instruction/archive residue together so future operators and downstream users can trust the repo again.
- Success criteria / acceptance:
  - one reviewed cleanup pass removes or collapses the highest-confidence dead or orphaned surfaces named in the issue
  - stale or contradictory docs/specs/tasks/instructions are updated or archived in the same lane so repo claims match current behavior
  - the design-system and design-reference surface is truthful, either by removing placeholder claims or by documenting the bounded remaining reality
  - the SDK artifact contract is corrected so exported return values are truthful
  - compatibility leftovers that remain are explicitly justified with live-consumer evidence
  - the final closeout states what was removed, what was intentionally kept, and what was carved out as follow-up work
- Constraints / non-goals:
  - prefer deletion or collapse over preserving dead compatibility layers
  - if a seam stays, explain the current consumer and reason to keep it
  - keep this lane out of `CO-82` provider-worker observability work and `CO-83` CO STATUS telemetry/rate-limit work
  - do not broaden into new runtime modes, UI redesigns, or release automation work unless directly required by the stale surfaces under cleanup

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `repo-wide cleanup`
  - `stale compatibility debt`
  - `contradictory docs`
  - `placeholder surfaces`
  - `truthfulness lane`
  - `remove or reconcile stale, contradictory, deprecated, placeholder, orphaned, or misleading repo surfaces`
  - `prefer deletion/collapse`
- Protected terms / exact artifact and surface names:
  - legacy selected-run presenter module
  - `uiDataController.ts`
  - `operatorDashboardPresenter.ts`
  - `.agent/task/templates/*`
  - uppercase legacy task templates under `.agent/task/`
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/run-review.ts`
  - `orchestrator/src/cli/rlm/alignment.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `docs/AGENTS.md`
  - `.agent/AGENTS.md`
  - stale MCP code-mode report archive
  - `packages/orchestrator-status-ui/app.js`
  - `RunManifestWriter`
  - `TaskStateStore`
  - `runPaths`
  - `packages/sdk-node/src/orchestrator.ts`
  - `eventsPath`
  - `stderrPath`
  - `packages/design-system/**`
  - `tasks/design-reference-pipeline.md`
  - `tasks/hi-fi-design-toolkit.md`
  - `docs/design/specs/**`
  - `orchestrator/src/sync/**`
  - the deprecated shared stdio shim (`packages/shared/streams/stdio.ts`)
  - `pipelineResolver.ts`
  - `rlmCodexRuntimeShell.ts`
  - `requiresCloud`
  - `requires_cloud`
  - `CO-82`
  - `CO-83`
- Nearby wrong interpretations to reject:
  - only cleaning README or active docs wording
  - deleting one or two obvious files and leaving the contradictory package or compatibility claims
  - folding CO STATUS telemetry or provider-worker observability work into this lane
  - treating placeholder packages or stale instruction surfaces as acceptable because they are not hot-path
  - preserving ambiguous compatibility layers without naming the live consumer

## Parity / Alignment Matrix
- Current truth:
  - selected-run-era docs and task packets still describe a removed legacy selected-run presenter module as the `/ui/data.json` authority even though the present control-host truth is anchored in `uiDataController.ts`, `operatorDashboardPresenter.ts`, `selectedRunProjection.ts`, and related compatibility/read-model seams
  - uppercase `.agent/task/*_TEMPLATE.md` files are still tracked while current repo guidance points authors at `.agent/task/templates/*`
  - `packages/design-system` still has placeholder-style scripts and minimal package scaffolding while older design-reference task/docs describe a delivered toolkit and visual-regression surface
  - `packages/sdk-node/src/orchestrator.ts` still needs a compatibility-safe, truthful contract for `eventsPath` and `stderrPath`
  - stale instruction and archive residue remains in active surfaces such as `docs/AGENTS.md`, `.agent/AGENTS.md`, and the old MCP code-mode report archive
  - several compatibility aliases and deprecated seams remain without a fresh keep-or-delete decision
- Reference truth:
  - active code, docs, task packets, and instruction surfaces should all describe the same current architecture
  - placeholder packages should not be described as shipped capabilities
  - compatibility surfaces that remain should have explicit rationale and live-consumer evidence
  - archive and instruction surfaces should use historical wording only when they are actually historical
- Target truth / intended delta:
  - dead or stale compatibility surfaces are removed or collapsed
  - retained compatibility seams are documented with explicit rationale and consumer evidence
  - touched docs/specs/tasks/instructions are updated in the same lane so repo claims match current behavior
  - placeholder or misleading package surfaces are either made truthful or carved out into explicit follow-up work
- Explicitly out-of-scope differences:
  - `CO-82` provider-worker observability and stall-debug work
  - `CO-83` CO STATUS telemetry, stage/event, token, throughput, session, and rate-limit work
  - new product features, new runtime modes, or a dashboard redesign

## Not Done If
- stale or orphaned code is removed but the docs/specs/tasks/instructions still describe it as active
- contradictory package, task, or spec claims remain around design-system/design-reference or SDK artifact surfaces
- ambiguous compatibility shims remain without either deletion or a documented live consumer and reason to keep them
- the lane duplicates `CO-82` or `CO-83` scope instead of excluding them explicitly
- the repo still carries clearly stale active instruction, template, or archive-report surfaces without truthfulness cleanup

## Goals
- Remove or collapse the highest-confidence dead, orphaned, placeholder, or contradictory surfaces named in `CO-88`.
- Update the surrounding docs/specs/tasks/instructions in the same lane so touched claims match reality.
- Correct misleading public contracts such as SDK artifact return values and placeholder package claims.
- Make explicit keep-or-delete decisions for compatibility candidates that remain ambiguous today.

## Non-Goals
- Reopening `CO-82` or `CO-83`.
- Redesigning the HTTP dashboard, CO STATUS UI, or general operator UX.
- Broad runtime-mode or orchestration feature work unrelated to truthfulness cleanup.
- Preserving stale compatibility layers by default simply because they already exist.

## Stakeholders
- Product: maintainers and downstream users who need the repo to tell the truth about what CO currently ships.
- Engineering: CLI/control-host, review-wrapper, docs/task-registry, SDK, and design-surface maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - the highest-confidence stale surfaces from the issue are either removed or justified explicitly
  - touched active docs/specs/tasks/instructions no longer contradict the current codepaths
  - placeholder package claims are reduced to truthful statements
  - validation and review evidence show the cleanup did not regress the touched seams
- Guardrails / Error Budgets:
  - keep deletions and rationale bounded to the surfaces named in the issue or directly adjacent contradictions discovered during the audit
  - prefer reusing current authoritative seams rather than adding new compatibility glue
  - if a larger adjacent problem appears, file a follow-up instead of absorbing it silently

## User Experience
- Personas:
  - maintainers auditing whether current docs and code tell the same story
  - downstream operators reading active docs and package surfaces
  - future CO agents relying on task packets and instruction surfaces
- User Journeys:
  - a maintainer can inspect the repo and see current, not historical, architecture claims
  - a downstream user is not misled by placeholder package or SDK contracts
  - a future agent can use active instructions and task packets without tripping over stale compatibility wording

## Technical Considerations
- Architectural Notes:
  - prefer removal or canonical-reference rewrites over preserving duplicate seams
  - keep history honest by converting stale present-tense wording into explicit historical wording when deletion is not appropriate
  - use the cleanup lane to reconcile codepaths and the docs/task registry together rather than letting them drift again
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/**`
  - `orchestrator/src/persistence/**`
  - `orchestrator/src/cli/services/pipelineResolver.ts`
  - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - `orchestrator/src/cli/rlm/alignment.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/run-review.ts`
  - `packages/sdk-node/src/orchestrator.ts`
  - `packages/design-system/**`
  - `packages/orchestrator-status-ui/app.js`
  - `docs/AGENTS.md`
  - `.agent/AGENTS.md`
  - `tasks/design-reference-pipeline.md`
  - `tasks/hi-fi-design-toolkit.md`
  - `docs/design/specs/**`
- stale MCP code-mode report archive

## Open Questions
- Which compatibility candidates still have live consumers that justify retention, especially around `orchestrator/src/sync/**`, the deprecated shared stdio shim, `pipelineResolver.ts`, `rlmCodexRuntimeShell.ts`, and `requiresCloud` vs `requires_cloud`?
- Is the smallest truthful treatment for the design-system surface selective deletion plus docs/task archival, or are there bounded currently-shipped surfaces that need to remain documented?

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review child stream and implementation validation
- Design: N/A
