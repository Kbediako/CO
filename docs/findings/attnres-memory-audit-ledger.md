# AttnRes Memory Audit Ledger

## Purpose
This is the parent-owned canonical synthesis artifact for the AttnRes-inspired fixed-model memory/autonomy audit. Subagents do broad exploration; this ledger holds only compressed findings, evidence pointers, and backlog decisions.

## Canonical Inputs
- Brief: `origin/docs/attnres-backlog-brief:docs/CODEX_BRIEF-attnres-memory-backlog.md`
- Baseline docs:
  - `AGENTS.md`
  - `docs/AGENTS.md`
  - `docs/README.md`
  - `docs/PRD-codex-orchestrator-autonomy.md`
  - `docs/TECH_SPEC-codex-orchestrator-autonomy.md`
  - `docs/TECH_SPEC-delegation-autonomy-platform.md`
  - `docs/TECH_SPEC-delegation-rlm-quick-wins.md`
  - `tasks/tasks-0303-orchestrator-autonomy.md`
  - `.agent/task/0303-orchestrator-autonomy.md`

## Protected Terms
- `source 0`
- `block memory`
- `run memory controller`
- `role-specific retrieval`
- `competitive scoring`
- `anti-dominance normalization`
- `experience retrieval`
- `externalized context`

## Delegated Stream Registry
| Stream | Agent ID | Scope | Primary evidence anchors |
| --- | --- | --- | --- |
| docs-spec-audit | `019d5ca0-3f9b-7b71-ae39-d45da200fe43` | Docs/spec truth, partials, and missing contracts | `docs/TECH_SPEC-delegation-rlm-quick-wins.md`, `docs/TECH_SPEC-delegation-autonomy-platform.md`, `docs/README.md`, `scripts/lib/review-prompt-context.ts`, `orchestrator/src/cli/rlm/context.ts`, `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/src/persistence/ExperienceStore.ts` |
| code-surface-audit | `019d5ca0-4405-7982-b59e-19ca991f881a` | Prompt/context assembly seams, artifact structure, planner/executor/delegate/RLM paths | `orchestrator/src/cli/services/runPreparation.ts`, `orchestrator/src/cli/adapters/CommandPlanner.ts`, `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, `orchestrator/src/cli/rlm/prompt.ts`, `orchestrator/src/cli/rlm/symbolic.ts` |
| eval-metrics-audit | `019d5ca0-4cc3-7323-ad1d-18cbe0bc1785` | Eval harnesses, outcome metrics, context-rot observability, A/B hooks | `evaluation/benchmarks/rlm-context-scale.mjs`, `evaluation/scenarios/rlm-context-scale.json`, `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/rlm/alignment.ts`, `docs/reference/metrics-collab-context-rot.md`, `docs/findings/0955-collab-evals-2026-01-22.md` |
| issue-dedupe-backlog-audit | `019d5ca0-5125-7f81-b7e0-4e1de3459a7f` | Existing issue/spec ownership, dedupe, dependency ordering | `tasks/tasks-0303-orchestrator-autonomy.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`, `tasks/index.json`, `docs/TASKS.md`, `tasks/specs/0959-experience-prompt-injection-delegation-skill-harmonization.md`, `tasks/tasks-0939-orchestrator-performance-reliability-loop-2.md`, `tasks/specs/0954-rlm-orchestrator-validation.md` |

## Capability Matrix
| Capability | Covered | Partial | Missing | Evidence / notes |
| --- | --- | --- | --- | --- |
| Task anchor persistence | x | x |  | Task docs, manifests, instruction sources, and review prompt context exist, but there is no explicit `source 0` contract that survives planner/executor/reviewer/delegate handoff. The planner seam is especially weak because `TaskContext` is sparse and currently non-consumed. Evidence: `docs/PRD-codex-orchestrator-autonomy.md`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/services/runPreparation.ts`, `orchestrator/src/cli/adapters/CommandPlanner.ts`, `scripts/lib/review-prompt-context.ts`. |
| Long-context handling | x |  |  | Symbolic RLM already provides bounded pointer-based `externalized context` and subcall drill-down rather than transcript bloat. Evidence: `docs/TECH_SPEC-delegation-rlm-quick-wins.md`, `orchestrator/src/cli/rlm/context.ts`, `orchestrator/src/cli/rlm/symbolic.ts`. |
| Phase history / block memory |  |  | x | No first-class `block memory` / phase-memory contract was found; existing artifacts are adjacent only. |
| Step-time context assembly | x | x |  | Reviewer assembly is explicit and rich, and symbolic RLM already has bounded drill-down context, but planner/executor/delegated step-time context remains fragmented and lacks a unified controller. Evidence: `scripts/lib/review-prompt-context.ts`, `orchestrator/src/cli/rlm/context.ts`, `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`. |
| Retrieval policy |  | x |  | Current policy is simple domain match plus top-K reward sorting; no freshness, `competitive scoring`, or `anti-dominance normalization`. Evidence: `orchestrator/src/persistence/ExperienceStore.ts`, `orchestrator/src/cli/run/manifest.ts`. |
| Role-specific retrieval |  | x |  | Reviewer context, symbolic RLM pointer reads, and cloud-only experience injection exist as fragments, but there is no unified `role-specific retrieval` policy. |
| Artifact indexing / drill-down | x | x |  | Structured artifacts already exist across `manifest.json`, `events.jsonl`, `run-summary.json`, `rlm/state.json`, context indexes, and review bundles, but drill-down retrieval/indexing is not centralized and consumers still do ad hoc selection. Extend `0939` rather than creating a duplicate indexing lane. |
| Experience reuse | x | x |  | `experiences.jsonl` persistence and bounded cloud prompt injection exist, but generalized non-cloud consumption paths are still missing. Extend `0959` rather than creating a duplicate umbrella. |
| Memory observability | x | x |  | Baseline observability exists through `manifest.json`, `events.jsonl`, `review/prompt.txt`, `review/telemetry.json`, `alignment/ledger.jsonl`, and `rlm/state.json`, but no inspectable memory-decision layer (`why picked`, `why excluded`, candidate set, dominance penalty) exists. |
| Evaluation / context-rot metrics |  | x |  | Metrics references, `rlm-context-scale`, alignment drift proxies, and review telemetry exist, but no bound fixed-model memory/context-rot execution gate or first-class A/B lane exists yet. Extend `0954` after memory surfaces land, or split if that owner becomes too awkward. |
| Rollout / safety / compatibility | x |  |  | Autonomy plumbing and compatibility owners already exist under `0303`, `0940`, `0951`, `0961`, `1097`, `1108`, and `1207`; this lane should be a sibling stream rather than a reset of those owners. |

## Deep Audit Streams
### docs-spec-audit
- Status: completed
- Covered / Partial / Missing:
  - Covered: `externalized context`, bounded symbolic RLM, basic `experience retrieval`, and baseline artifact observability are already specified and shipped.
  - Partial: task anchoring, role-aware retrieval, retrieval policy, and context-rot/eval surfaces exist only as fragments across multiple docs and code paths.
  - Missing: `source 0`, `block memory`, `run memory controller`, explicit `role-specific retrieval`, `competitive scoring`, `anti-dominance normalization`, non-cloud experience injection, and unified artifact drill-down retrieval.
- Evidence:
  - `docs/TECH_SPEC-delegation-rlm-quick-wins.md`
  - `docs/TECH_SPEC-delegation-autonomy-platform.md`
  - `docs/README.md`
  - `docs/standalone-review-guide.md`
  - `docs/PRD-experience-prompt-injection-and-delegation-skill-harmonization.md`
  - `tasks/specs/0959-experience-prompt-injection-delegation-skill-harmonization.md`
  - `tasks/specs/0940-delegation-autonomy-platform.md`
  - `orchestrator/src/cli/rlm/context.ts`
  - `orchestrator/src/cli/rlm/symbolic.ts`
  - `orchestrator/src/persistence/ExperienceStore.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `scripts/lib/review-prompt-context.ts`
- Protected terms / wrong interpretations:
  - Keep literal: `source 0`, `block memory`, `run memory controller`, `role-specific retrieval`, `competitive scoring`, `anti-dominance normalization`, `experience retrieval`, `externalized context`.
  - Reject: "this is model-training", "memory = bigger transcripts", "cloud prompt injection already solves experience retrieval", "learning snapshots are the runtime memory controller".
- Candidate backlog items:
  - New sibling-stream issues for `source 0`, `block memory`, controller/retrieval policy, and eval harness.
  - Update `0940` to align claimed RLM policy/event observability with shipped truth.
  - Update `0959` only after controller contract exists if non-cloud experience injection is desired.

### code-surface-audit
- Status: completed
- Covered / Partial / Missing:
  - Covered: reviewer step-time context is explicitly assembled, symbolic RLM already writes real externalized context plus drill-down artifacts, and runtime artifacts are already structured enough for retrieval.
  - Partial: executor/delegated prompt assembly exists across cloud, provider-worker, child-lane, and spawn transport surfaces, but it is fragmented rather than controlled by one memory layer.
  - Missing: repo-wide `source 0`, structured `block memory`, central `run memory controller`, explicit `role-specific retrieval`, `competitive scoring`, `anti-dominance normalization`, and any tester-specific prompt-memory layer.
- Evidence:
  - `orchestrator/src/cli/services/runPreparation.ts`
  - `orchestrator/src/cli/adapters/CommandPlanner.ts`
  - `scripts/lib/review-prompt-context.ts`
  - `scripts/run-review.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/delegationServer.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/src/cli/rlm/context.ts`
  - `orchestrator/src/cli/rlm/prompt.ts`
  - `orchestrator/src/cli/rlm/symbolic.ts`
  - `orchestrator/src/cli/run/runPaths.ts`
  - `orchestrator/src/cli/events/runEventStream.ts`
  - `orchestrator/src/cli/services/runSummaryWriter.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
  - `orchestrator/src/persistence/ExperienceStore.ts`
  - `orchestrator/src/cli/exec/experience.ts`
  - `orchestrator/src/cli/exec/tfgrpo.ts`
  - `orchestrator/src/learning/harvester.ts`
  - `orchestrator/src/learning/runner.ts`
  - `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`
  - `orchestrator/src/persistence/RunManifestWriter.ts`
- Protected terms / wrong interpretations:
  - Keep literal: `source 0`, `block memory`, `run memory controller`, `role-specific retrieval`, `competitive scoring`, `anti-dominance normalization`, `experience retrieval`, `externalized context`.
  - Reject: "the planner already has meaningful memory because `TaskContext` exists", "`delegate.spawn` is the delegated prompt builder", "prompt packs already provide role-specific retrieval", "RLM substring search is already a general retrieval layer".
- Candidate backlog items:
  - `P0`: add additive `memory.source_0` to the run contract at `bootstrapManifest`, schema, and shared manifest types, with reader hooks across reviewer/cloud/provider-worker/child-lane/RLM.
  - `P0`: fix the planner dead seam by making `TaskContext` meaningful or adding a dedicated pre-planner memory selection step.
  - `P1`: emit structured pointer-based `block memory` from lifecycle/state writers rather than prose-only summaries.
  - `P1`: convert experience reuse from string snippets to structured references and shared retrieval helpers.
  - `P1`: add one artifact-retrieval helper over `manifest.json`, `events.jsonl`, `run-summary.json`, `rlm/state.json`, context indexes, and subcalls, then reuse it across surfaces.
  - `P2`: add the actual `run memory controller` with role-specific retrieval and scored, diversity-aware selection.
  - `P2`: retire or quarantine the legacy non-`cli/` manifest layout before memory features rely on path discovery.

### eval-metrics-audit
- Status: completed
- Covered / Partial / Missing:
  - Covered: bounded `externalized context` correctness, symbolic state, alignment-drift proxies, standalone-review telemetry, and successful-run experience retrieval already produce some measurable signals.
  - Partial: manifests, events, learning snapshots, collab manifests, and doctor usage form an auditable substrate, but they do not yet emit the core context-rot outcomes this initiative needs.
  - Missing: first-class outcome schema for memory/autonomy, pause/resume context-rot automation, `source 0`, `block memory`, controller provenance, `competitive scoring`, `anti-dominance normalization`, and a fixed-model A/B lane.
- Evidence:
  - `evaluation/benchmarks/rlm-context-scale.mjs`
  - `evaluation/scenarios/rlm-context-scale.json`
  - `evaluation/tests/harness.test.ts`
  - `evaluation/README.md`
  - `evaluation/harness/types.ts`
  - `orchestrator/src/cli/rlm/alignment.ts`
  - `orchestrator/tests/RlmAlignment.test.ts`
  - `scripts/lib/review-execution-state.ts`
  - `scripts/lib/review-execution-telemetry.ts`
  - `docs/TECH_SPEC-standalone-review-runtime-telemetry.md`
  - `orchestrator/src/cli/metrics/metricsRecorder.ts`
  - `orchestrator/src/cli/events/runEventStream.ts`
  - `docs/reference/metrics-collab-context-rot.md`
  - `docs/findings/0955-collab-evals-2026-01-22.md`
  - `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T06-09-33-041Z-6fad25a7/manifest.json`
  - `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T06-09-33-041Z-6fad25a7/events.jsonl`
- Protected terms / wrong interpretations:
  - Keep literal: `source 0`, `block memory`, `run memory controller`, `role-specific retrieval`, `competitive scoring`, `anti-dominance normalization`, `experience retrieval`, `externalized context`.
  - Reject: "`rlm-context-scale` proves context rot is solved", "review telemetry equals general autonomy telemetry", "collab event coverage already measures contradiction/re-discovery/resume latency".
- Candidate backlog items:
  - Add outcome schema to `manifest.json`, `events.jsonl`, and `.runs/<task-id>/metrics.json` for contradiction counts, rediscovery, resume latency, manual repair, repeated-failure streaks, retrieval hits/misses, and provenance.
  - Turn the paused 0955-style context-rot lane into an automated pause/resume eval with explicit success criteria.
  - Add a fixed-model A/B lane that varies memory configuration or retrieval policy without changing the model.
  - Require every backlog slice to reference expected scenario, manifest, event stream, memory/review artifact, and summary artifact paths.

### issue-dedupe-backlog-audit
- Status: completed
- Covered / Partial / Missing:
  - Covered ownership already exists for autonomy plumbing (`0303`, `0940`, `0951`, `0961`, `1097`, `1108`, `1207`).
  - Partial ownership exists for experience prompt injection (`0959`), indexing/perf (`0939`), learning snapshots (`0607`), and eval/reference material (`0954`).
  - Missing owners remain for `source 0`, `block memory`, central controller, retrieval-stage scoring/diversity, and memory-decision observability.
- Evidence:
  - `tasks/tasks-0303-orchestrator-autonomy.md`
  - `docs/PRD.md`
  - `docs/TECH_SPEC.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `tasks/specs/0940-delegation-autonomy-platform.md`
  - `docs/FOLLOWUP-0951-true-rlm-symbolic.md`
  - `tasks/specs/0961-recursive-rlm-enhancements.md`
  - `tasks/specs/0959-experience-prompt-injection-delegation-skill-harmonization.md`
  - `tasks/tasks-0939-orchestrator-performance-reliability-loop-2.md`
  - `docs/TECH_SPEC-continuous-learning-pipeline.md`
  - `tasks/specs/0954-rlm-orchestrator-validation.md`
  - `orchestrator/src/persistence/ExperienceStore.ts`
- Protected terms / wrong interpretations:
  - Keep literal: `source 0`, `block memory`, `run memory controller`, `role-specific retrieval`, `competitive scoring`, `anti-dominance normalization`, `manifest.prompt_packs[].experience_slots`, `manifest.prompt_packs[].experiences`, `source.txt`, `index.json`, `ctx:`, `subcall:`.
  - Reject: "extend `0303` because it is the old umbrella", "new externalized-context issue", "new review-prompt memory issue", "`competitive scoring` can just reuse TF-GRPO rewarders".
- Candidate backlog items:
  - Recommendation is a sibling autonomy stream.
  - Update `0959`, `0939`, and later `0954`; optionally update `0607` only if retrieval requires more learning metadata.
  - Create new issues only for truly missing memory-control surfaces.

## Dedupe Map
| Surface | Current owner(s) | Decision | Notes |
| --- | --- | --- | --- |
| `0303` autonomy | `0303`, overview docs, `tasks/index.json` | Do not extend directly | `0303` is implemented in checklist terms, but overview docs/status are stale; use a sibling stream instead of reopening it. |
| RLM / delegation autonomy | `0940`, `0951`, `0961` | Update adjacent truth only | These own `externalized context`, symbolic recursion, and adjacent autonomy surfaces already; do not create duplicate externalized-context issues. |
| Review-context transport | `1097`, `1108`, `1207`, review prompt builder | Do not duplicate | Only update if memory controller later needs a truthful review-context transport seam. |
| Experience prompt consumption | `0959` | Extend | Current ownership is cloud-biased; broaden only after controller contract exists. |
| Retrieval indexing / performance | `0939` | Extend | Use this for caching/index/truncation and drill-down lookup performance rather than opening a parallel issue. |
| Learning snapshots / offline learning | `0607` | Extend only if required | Learning artifacts are adjacent inputs, not the controller itself. |
| Eval / context-rot surfaces | `0954`, `0955`, metrics refs, eval harness | Extend later | Promote to a real execution gate only after memory surfaces exist; may need outcome-schema work first. |
| Retrieval-stage scoring / diversity | Adjacent only: `0506` reward persistence | Create new issue | Must be explicitly framed as retrieval-stage memory selection to avoid semantic collision with TF-GRPO reward scoring. |
| `source 0`, `block memory`, controller | No clean owner | Create new issues | These are the true missing contracts and should be dependency-ordered vertical slices. |
| Planner context seam | `runPreparation.ts`, `CommandPlanner.plan` | Include in early issue scope | Current planner `TaskContext` is effectively dead input and is the cleanest fast-win insertion point for source-0 / memory selection. |
| Legacy manifest layout compatibility | `manifest.ts`, `RunManifestWriter.ts` | Track as hygiene follow-on | Do not let new memory lookup depend on ambiguous legacy path discovery. |

## Dependency Graph
1. Audit + dedupe baseline
2. `source 0` anchor contract
3. planner consumption fix / pre-planner memory selection seam
4. phase/block memory contract
5. central run memory controller
6. role-specific retrieval profiles
7. competitive scoring + anti-dominance normalization
8. artifact indexing + drill-down retrieval
9. bounded successful-run experience retrieval
10. memory observability/debugging
11. autonomy/context-rot evaluation harness
12. rollout / safety / compatibility

## Backlog Decisions
- Existing issues to update:
  - `0940` for truthful delegated RLM policy/event observability wording or missing event surfaces
  - `0959` for non-cloud experience consumption after controller contract exists
  - `0939` for retrieval/drill-down indexing performance
  - `0954` for a real fixed-model memory/context-rot execution gate after prerequisite surfaces land
  - `0607` only if retrieval requires extra `learning.snapshot` / `learning.validation` metadata
- New issues to create:
  - `source 0` anchor contract
  - planner consumption / pre-planner memory selection seam if it does not fit cleanly into the `source 0` slice
  - `block memory` / phase memory contract
  - central `run memory controller` + `role-specific retrieval` policy
  - retrieval-stage `competitive scoring` + `anti-dominance normalization`
  - artifact drill-down retrieval + inspectable memory-decision observability
  - outcome-schema + fixed-model memory/context-rot evaluation harness if `0954` extension proves too awkward
- Markdown drafts only fallback: `docs/findings/attnres-memory-backlog-drafts.md`
- Recommended first 3 implementation issues:
  - `source 0` anchor contract
  - planner consumption / pre-planner memory selection seam
  - `block memory` / phase memory contract
- Doc prerequisites before implementation:
  - resolve doc-truth drift around `0303` ownership/status in overview docs
  - resolve `0940` delegated RLM policy/event observability ambiguity before using it as the memory baseline
  - resolve stale measurement assumptions in `0303` / `0940` so future issue acceptance criteria do not inherit false metrics claims
  - refresh/update exact issue bodies for `0959`, `0939`, and `0954` if they remain the chosen owners

## Key Contradictions And Guardrails
- `0303` is implemented in checklist terms but still appears planning/approved in overview docs and `tasks/index.json`. Treat it as a stale owner surface, not the extension target.
- `0940` claims delegated RLM defaults and RLM event richness that are not cleanly aligned with the shipped symbolic/runtime docs and verified event symbols.
- `0303` still describes approval-reuse / latency-histogram / JSONL-adoption metrics that are not the current runtime aggregation truth. Do not inherit those as the memory initiative metric baseline.
- The context-rot rubric is explicit in docs, but the old 0955 findings still leave pause/resume continuity unresolved. Treat rubric docs as planning input, not proof of a shipped gate.
- Cloud prompt injection and learning snapshots are adjacent memory inputs, not the same thing as a runtime memory controller.
- Reviewer context is currently much richer than planner/executor/delegated context. Treat that asymmetry as a real implementation gap, not a naming quirk.
- Prompt packs look richer on paper than their live consumption paths; current runtime mostly uses `domain`, `stamp`, `experienceSlots`, and stringified `experiences`.
- `competitive scoring` must stay tied to retrieval-stage memory selection, not generic reward persistence.

## Nearby Wrong Interpretations To Reject
- "This is a retraining or model-architecture initiative."
- "Memory means append more logs or bigger transcripts."
- "Experience retrieval is already solved because cloud prompts inject snippets."
- "Learning snapshots are the runtime memory system."
- "Extend `0303` because it is the existing umbrella."
- "Externalized context alone already gives us `source 0`, `block memory`, and the memory controller."
- "The first step is a broad rewrite instead of small contract slices plus eval slices."
