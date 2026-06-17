# PRD - CO-594 consolidate Linear backlog and Ponytail refactor

## Traceability
- Linear issue: `CO-594`
- Task id: `20260617-linear-co-594-co-594-consolidation`
- Registry id: `20260617-linear-co-594`
- Canonical owner key: `co:linear-consolidation-ponytail-refactor:2026-06-17`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=co:linear-consolidation-ponytail-refactor:2026-06-17`
- Branch: `kb/linear-consolidation-ponytail-refactor`

## Summary
- Problem Statement: CO has a broad open backlog with overlapping docs freshness, review, Linear follow-up, release posture, and process-governance lanes. Working each one as a separate active implementation lane adds bloat and hides the smallest behavior-preserving refactor path.
- Desired Outcome: CO-594 is the canonical docs-first owner for consolidating open CO work provenance, passing docs-review, running a repo-wide Ponytail audit, and landing only the smallest reviewable behavior-preserving simplifications.

## User Request Translation
- User intent / needs: verify Linear access, consolidate current CO/CO-orchestrator Linear work into one provenance-preserving issue/spec packet, then simplify the repo without changing documented behavior.
- Success criteria / acceptance: source issues remain linked, docs-first packet passes docs-review before implementation, subagents contribute inventory/audit/planning/validation, and final implementation deletes or shrinks more than it adds without weakening checks.
- Constraints / non-goals: no push, merge, destructive reset, bulk Linear closeout, test/docs deletion to game LOC, new framework, package-manager migration, or speculative orchestration layer.

## Intent Checksum
- Exact user wording / phrases to preserve: `docs-first`, `behavior-preserving`, `Linear access`, `canonical issue/spec packet`, `preserves provenance`, `Ponytail full`, `smallest reviewable changes`, `subagents`, `docs-review`, `required checks`.
- Protected terms / exact artifact and surface names: `CO-594`, `CO Control and Advisory`, `codex-cli 0.140.0`, `gpt-5.5`, `goals`, `multi_agent`, `in_app_browser`, `js_repl`, `docs/TASKS.md`, `tasks/index.json`, `docs:freshness`, `spec-guard`, `delegation-guard`.
- Nearby wrong interpretations to reject: do not treat completed `CO-588` as the active owner, do not fold blocked cloud work into this local refactor, do not close source issues in bulk, do not widen into every backlog feature, and do not use a new abstraction to simplify old abstractions.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Linear ownership | `CO-594` is the new In Progress canonical issue. `CO-588` is Done historical provenance. | Linear inventory on 2026-06-17 found open CO team issues plus `CO Control and Advisory` project scope. | `CO-594` owns this run; source issues remain linked/provenance only unless later targeted mutation is justified. | Bulk closeout, source status churn, or treating no-project items as out of existence. |
| Codex posture | Local CLI evidence in this run is `codex-cli 0.140.0`; `goals`, `multi_agent`, and `in_app_browser` are stable true; `js_repl` and `js_repl_tools_only` are removed. | Canonical version policy remains CO-590 `0.135.0` until a release-intake policy update promotes a newer CLI. Official OpenAI latest-model docs name `gpt-5.5` latest and recommend outcome-first prompts with explicit success criteria and stopping rules. | Preserve observed local `0.140.0` evidence while keeping current public posture on canonical `0.135.0` unless policy is updated. | Broad model/prompt migration or silent Codex CLI posture promotion outside touched surfaces. |
| Refactor posture | Backlog contains stale fallback/seam and process bloat candidates. | Ponytail full: delete/shrink first, stdlib/native/already-installed before new code. | Use audit evidence to select the smallest behavior-preserving simplification. | Public contract removal, validation weakening, or adding another compatibility branch. |
| Execution ownership | Parent thread integrates; subagents handle substantive inventory, posture, audit, planning, implementation, and validation streams. | User contract requires subagents. | Keep subagent prompts explicit-role and bounded; close agents after results. | Parent-only non-trivial implementation. |

## Source Inventory
- Canonical active owner: `CO-594`.
- Source issue statuses are unchanged; this table records provenance and scope only.

| Identifier | Title | Linear link | Status | Assignee | Priority | Labels | Project membership | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CO-593 | CO: refresh setup book stale Codex CLI posture after 0.135.0 intake | [CO-593](https://linear.app/asabeko/issue/CO-593/co-refresh-setup-book-stale-codex-cli-posture-after-01350-intake) | In Progress | asabeko | Medium | Lifecycle: Analysis; Area: Docs; Area: Infra; Priority: P2; Bug | CO Control and Advisory | Active current-Codex-posture cleanup; informs touched docs posture. |
| CO-490 | CO: clear required cloud-canary environment blocker for Codex CLI release promotion | [CO-490](https://linear.app/asabeko/issue/CO-490/co-clear-required-cloud-canary-environment-blocker-for-codex-cli) | Blocked | Unassigned | High | Lifecycle: Implementation; Area: DevOps; Area: Infra; Priority: P1; Bug | CO Control and Advisory | Release-promotion blocker retained as out-of-scope boundary. |
| CO-521 | CO: refresh docs:freshness rolling owner when configured owner is terminal | [CO-521](https://linear.app/asabeko/issue/CO-521/co-refresh-docsfreshness-rolling-owner-when-configured-owner-is) | Backlog | Unassigned | No priority | Bug; Area: Agents; Area: Docs; Area: Infra; Lifecycle: Analysis; Priority: P1 | CO Control and Advisory | Docs freshness owner/provenance cluster. |
| CO-591 | CO: Convert historical docs/TASKS snapshots to evidence-linked checklist rows | [CO-591](https://linear.app/asabeko/issue/CO-591/co-convert-historical-docstasks-snapshots-to-evidence-linked-checklist) | Backlog | Unassigned | Medium | Lifecycle: Implementation; Area: Docs; Priority: P2; Improvement | None | Adjacent no-project docs provenance work; included for scope visibility. |
| CO-528 | Spec-grounded review controller for standards, patch proposals, and agent-loop feedback | [CO-528](https://linear.app/asabeko/issue/CO-528/spec-grounded-review-controller-for-standards-patch-proposals-and) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Priority: P2; Area: DevOps; Area: Agents; Area: Docs; Improvement | CO Control and Advisory | Review/preflight governance cluster. |
| CO-537 | CO: review contract v2 for spec, standards, code, and agent-loop verdicts | [CO-537](https://linear.app/asabeko/issue/CO-537/co-review-contract-v2-for-spec-standards-code-and-agent-loop-verdicts) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Area: Infra; Area: Agents; Improvement; Priority: P2 | CO Control and Advisory | Review/preflight governance cluster. |
| CO-561 | CO: add strict docs freshness/fallback cross-surface preflight gate | [CO-561](https://linear.app/asabeko/issue/CO-561/co-add-strict-docs-freshnessfallback-cross-surface-preflight-gate) | Backlog | Unassigned | High | Lifecycle: Analysis; Area: Docs; Area: Infra; Priority: P2; Improvement | CO Control and Advisory | Strict docs/fallback preflight cluster; constrains validation. |
| CO-519 | CO: label release-detector-created follow-up issues deterministically | [CO-519](https://linear.app/asabeko/issue/CO-519/co-label-release-detector-created-follow-up-issues-deterministically) | Backlog | Unassigned | No priority | Bug; Area: Agents; Area: Infra; Lifecycle: Analysis; Priority: P2 | CO Control and Advisory | Release-detector follow-up behavior cluster. |
| CO-579 | CO: replace terminal CO-575 docs freshness maintenance owner | [CO-579](https://linear.app/asabeko/issue/CO-579/co-replace-terminal-co-575-docs-freshness-maintenance-owner) | Backlog | asabeko | High | Lifecycle: Implementation; Area: Docs; Area: Infra; Area: Agents; Priority: P1; Improvement; Bug | CO Control and Advisory | Docs freshness owner/provenance cluster. |
| CO-547 | CO: preserve docs-freshness repo-gate owner verification truth | [CO-547](https://linear.app/asabeko/issue/CO-547/co-preserve-docs-freshness-repo-gate-owner-verification-truth) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Priority: P1; Area: Infra; Area: Agents; Area: Docs; Area: DevOps; Improvement; Bug | CO Control and Advisory | Docs freshness status truth cluster. |
| CO-564 | CO: evaluate parser-assisted Linear Markdown comparison contract | [CO-564](https://linear.app/asabeko/issue/CO-564/co-evaluate-parser-assisted-linear-markdown-comparison-contract) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Priority: P1; Area: Infra; Area: Agents; Bug | CO Control and Advisory | Linear Markdown comparison cluster. |
| CO-531 | CO: tolerate Linear Markdown normalization in create-follow-up traceability | [CO-531](https://linear.app/asabeko/issue/CO-531/co-tolerate-linear-markdown-normalization-in-create-follow-up) | Backlog | Unassigned | No priority | Area: Infra; Area: Agents; Lifecycle: Implementation; Priority: P2; Bug | CO Control and Advisory | Linear Markdown/create-follow-up reconciliation cluster. |
| CO-541 | CO: continue create-follow-up reconciliation after Linear markdown normalization | [CO-541](https://linear.app/asabeko/issue/CO-541/co-continue-create-follow-up-reconciliation-after-linear-markdown) | Backlog | Unassigned | No priority | Bug; Area: Agents; Area: Infra; Priority: P2; Lifecycle: Implementation | CO Control and Advisory | Linear Markdown/create-follow-up reconciliation cluster. |
| CO-550 | CO: schedule quota hygiene audit and escalation monitor | [CO-550](https://linear.app/asabeko/issue/CO-550/co-schedule-quota-hygiene-audit-and-escalation-monitor) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Area: Agents; Area: Infra; Feature; Priority: P1 | None | Adjacent no-project quota hygiene work; included for scope visibility. |
| CO-540 | CO: classify prerelease upstream mismatch without blocking stable Codex CLI posture | [CO-540](https://linear.app/asabeko/issue/CO-540/co-classify-prerelease-upstream-mismatch-without-blocking-stable-codex) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Priority: P2; Area: Infra; Area: Agents; Bug | CO Control and Advisory | Release-detector posture follow-up behavior cluster. |
| CO-539 | CO: refresh done-closeout provenance waiver drift | [CO-539](https://linear.app/asabeko/issue/CO-539/co-refresh-done-closeout-provenance-waiver-drift) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Priority: P1; Area: Infra; Area: Agents; Area: Docs; Improvement | CO Control and Advisory | Provenance/closeout reliability cluster. |
| CO-517 | CO: stabilize Core Lane full-matrix flakes exposed by docs-only PR reruns | [CO-517](https://linear.app/asabeko/issue/CO-517/co-stabilize-core-lane-full-matrix-flakes-exposed-by-docs-only-pr) | Backlog | Unassigned | No priority | Lifecycle: Implementation; Priority: P2; Area: DevOps; Area: Agents; Bug | CO Control and Advisory | CI reliability cluster; informs validation risk. |
| CO-588 | CO: consolidated orchestration for CO backlog completion | [CO-588](https://linear.app/asabeko/issue/CO-588/co-consolidated-orchestration-for-co-backlog-completion) | Done | asabeko | High | Lifecycle: Implementation; Area: Docs; Area: Infra; Area: Agents; Priority: P1; Improvement; Bug | CO Control and Advisory | Historical predecessor only; not the active owner. |
| CO-590 | CO: Codex CLI 0.135.0 release-intake and posture audit | [CO-590](https://linear.app/asabeko/issue/CO-590/co-codex-cli-01350-release-intake-and-posture-audit) | Done | asabeko | High | Lifecycle: Analysis; Area: DevOps; Area: Docs; Area: Agents; Priority: P1; Improvement | CO Control and Advisory | Historical current-posture provenance. |
| CO-518 | CO: Codex CLI 0.130.0 release-intake and posture audit | [CO-518](https://linear.app/asabeko/issue/CO-518/co-codex-cli-01300-release-intake-and-posture-audit) | Done | asabeko | No priority | Lifecycle: Analysis; Area: DevOps; Area: Docs; Area: Agents; Priority: P1; Improvement | CO Control and Advisory | Older posture lineage for compatibility context. |

## Not Done If
- Source issue identifiers, titles, links, status, assignee, priority, labels, project, or rationale are not preserved.
- Repo implementation starts before docs-review passes.
- The refactor increases bloat, adds new dependencies, weakens docs/review/test gates, or changes documented behavior.
- Non-trivial logic lacks a runnable validation.

## Goals
- Land a current CO-594 docs-first packet.
- Use Ponytail audit findings to pick a small safe refactor target.
- Remove or shrink stale seams and duplication while keeping behavior and validation intact.

## Non-Goals
- No cloud environment repair for `CO-490`.
- No wholesale backlog implementation.
- No Linear source issue bulk mutations.
- No broad replacement of CO orchestration architecture.

## Metrics & Guardrails
- Primary Success Metrics: docs-review clean; required checks pass; final diff is smaller/simpler than baseline; at least one targeted runnable validation covers non-trivial logic.
- Guardrails / Error Budgets: zero known behavior regressions; zero skipped required gates without recorded blocker; no new dependency unless explicitly justified and already unavailable by stdlib/native/installed deps.

## Technical Considerations
- Architectural Notes: prefer deletion or local simplification over new helpers. Treat `xhigh` as justified for this hard async agentic CO lane, while noting official docs default `medium` and reserve `xhigh` for hardest async/eval work.
- Dependencies / Integrations: Linear connector, OpenAI docs MCP, Codex CLI/features, docs-first files, docs-review, delegation/multi-agent tools.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Local Codex posture docs | This run observed local `codex-cli 0.140.0`, but canonical public posture remains CO-590 `0.135.0` until release-intake gates promote a newer CLI. | justify retaining fallback | CO-594 / CO-590 | Touched docs/spec posture must distinguish observed local smoke from adopted policy. | 2026-06-17 | 2026-06-17 | 30 days | A release-intake lane promotes `0.140.0`, or touched docs stop naming observed smoke as current adopted posture. | `codex --version`, `codex features list`, docs-review. |
| Implementation seams from audit | Candidate stale fallback/seam behavior to be selected after Ponytail audit. | remove fallback | CO-594 | Audit identifies a safe redundant seam. | 2026-06-17 | 2026-06-17 | Immediate for selected target. | Selected stale seam is deleted or collapsed with tests proving preserved behavior. | Focused runnable validation plus required checks. |

- Contract name: local Codex posture evidence boundary.
- Owning surface: CO-594 docs packet and CO-590 version policy.
- Steady-state proof: touched docs distinguish observed local `0.140.0` smoke from canonical public `0.135.0` policy.
- Tests/docs: `codex --version`, `codex features list`, CO-594 docs-review, and CO-590 policy references.
- Non-expiring rationale: the posture boundary is a documented release-intake contract, not a temporary runtime fallback; promotion requires a separate release-intake lane.

## Open Questions
- Which Ponytail audit finding is safest to implement in one reviewable slice after docs-review?
- Does docs-review require `docs/docs-freshness-registry.json` entries for the new packet in this checkout?

## Approvals
- Product: CO-594 Linear issue created and related to source issues on 2026-06-17.
- Engineering: pending docs-review.
- Design: not applicable.
