# AttnRes Fixed-Model Memory Backlog Drafts

## Decision Summary
- Recommendation: shape this as a sibling autonomy stream, not an extension of `0303`, and not a new umbrella.
- Reason:
  - `0303` already owns broad autonomy wrapper/tooling adoption, but its overview-doc ownership/status is stale.
  - `0940`, `0951`, `0961`, `1097`, `1108`, and `1207` already own adjacent autonomy, externalized-context, and review-context seams.
  - `0959`, `0939`, `0954`, and optionally `0607` are the right update targets for partial ownership surfaces.
- Do not duplicate:
  - `externalized context`
  - `ctx:` / `subcall:` pointers
  - standalone-review task/startup context
  - cloud-only prompt-injection work already owned by `0959`
  - reward persistence already owned by `0506`

## Dedupe Map
| Surface | Action | Owner / target |
| --- | --- | --- |
| `0303` autonomy umbrella | Do not extend | Sibling stream only |
| Delegated RLM policy and event truth | Update existing | `0940` |
| Experience prompt consumption | Update existing | `0959` |
| Retrieval indexing / drill-down performance | Update existing | `0939` |
| Fixed-model memory eval gate | Update existing | `0954` |
| Learning snapshot retrieval metadata | Update only if needed | `0607` |
| `source 0` | Create | New issue |
| Planner memory-consumption seam | Create | New issue |
| `block memory` | Create | New issue |
| `run memory controller` / `role-specific retrieval` | Create | New issue |
| `competitive scoring` / `anti-dominance normalization` | Create | New issue |
| Memory provenance / outcome schema | Create | New issue |

## Dependency-Ordered Backlog
1. Update `0940`: truth-align delegated RLM policy and memory-observability claims with runtime reality.
2. New: add `source 0` to the run contract and shared prompt-consumer read path.
3. New: make planner/pre-planner memory selection real instead of leaving `TaskContext` effectively dead.
4. New: emit structured pointer-based `block memory`.
5. Update `0939`: add shared artifact retrieval helper and central drill-down indexing/performance.
6. Update `0959`: upgrade experience reuse to structured refs and non-cloud consumption.
7. New: add `run memory controller` with `role-specific retrieval` profiles.
8. New: add retrieval-stage `competitive scoring` and `anti-dominance normalization`.
9. New: add memory provenance and outcome schema in manifest/events/metrics.
10. Update `0954`: add fixed-model A/B and pause/resume context-rot gate on top of the new surfaces.
11. Conditional update `0607`: add retrieval-facing learning metadata only if the controller needs it.

## First 3 Recommended Implementation Issues
1. New issue: add `source 0` to the run contract and shared read path.
2. New issue: make planner/pre-planner memory selection real.
3. New issue: emit structured pointer-based `block memory`.

## Existing Issue Update Drafts

### Update 0940
- Recommended labels: `Improvement`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `0940: Truth-align delegated RLM policy and event observability with shipped runtime`
- Problem statement:
  - `0940` currently reads like the canonical autonomy/memory baseline, but parts of it overclaim runtime truth. The spec says delegated runs default to `rlm.policy=always` and advertises rich `rlm_context_*` / `rlm_subcall_*` event families, while shipped code and guides still show narrower symbolic/runtime truth.
- Why it matters for autonomous issue/task completion:
  - Future fixed-model memory issues will inherit the wrong baseline unless `0940` is narrowed or the missing event surfaces are actually implemented.
- Protected terms / exact surfaces:
  - `externalized context`
  - `events.jsonl`
  - `manifest.json`
  - `rlm/state.json`
  - `docs/TECH_SPEC-delegation-autonomy-platform.md`
  - `tasks/specs/0940-delegation-autonomy-platform.md`
  - `orchestrator/src/cli/events/runEventStream.ts`
  - `orchestrator/src/cli/control/controlWatcher.ts`
  - `orchestrator/src/cli/control/authenticatedRouteComposition.ts`
- Explicit non-goals:
  - introducing the full memory controller
  - broad autonomy rewrites
  - retraining/model changes
- Acceptance criteria:
  - docs and runtime truth agree on delegated RLM policy defaults
  - docs and runtime truth agree on which RLM-specific events actually exist
  - if new RLM event families are chosen instead of doc narrowing, they are emitted into `events.jsonl` with tests
  - overview docs stop implying `0940` already solved the memory initiative
- Evidence / test plan:
  - repo diff against `docs/TECH_SPEC-delegation-autonomy-platform.md`, `tasks/specs/0940-delegation-autonomy-platform.md`
  - targeted tests around `runEventStream` or equivalent control/RLM event surfaces
  - sample `.runs/<task-id>/cli/<run-id>/events.jsonl`
- Dependencies:
  - none
- Not done if:
  - `0940` still overclaims event coverage
  - the policy/default story still conflicts between docs and code
- Rollback / containment:
  - docs-only narrowing is acceptable as the containment path if event implementation is deferred
- Nearby wrong interpretations to reject:
  - "`0940` already gives us the run memory controller"
  - "control-plane events are the same as memory-specific RLM observability"

### Update 0939
- Recommended labels: `Improvement`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `0939: Shared artifact retrieval helper and indexed drill-down retrieval for memory consumers`
- Problem statement:
  - Structured artifacts already exist across `manifest.json`, `events.jsonl`, `run-summary.json`, `rlm/state.json`, and context/subcall artifacts, but current consumers still do ad hoc lookup and path heuristics.
- Why it matters:
  - `block memory`, controller retrieval, provenance, and eval slices all need one shared drill-down path instead of duplicating retrieval/index logic.
- Protected terms / exact surfaces:
  - `manifest.json`
  - `events.jsonl`
  - `run-summary.json`
  - `rlm/state.json`
  - `.runs/<task-id>/cli/<run-id>/rlm/context/source.txt`
  - `.runs/<task-id>/cli/<run-id>/rlm/context/index.json`
  - `orchestrator/src/cli/run/runPaths.ts`
  - `orchestrator/src/cli/services/runSummaryWriter.ts`
  - `scripts/lib/run-manifests.js`
- Explicit non-goals:
  - deciding memory ranking/scoring policy
  - implementing the memory controller itself
- Acceptance criteria:
  - one shared artifact retrieval helper exists for the listed artifacts
  - helper supports pointer-based drill-down, not just whole-file string dumps
  - retrieval/index path is reused by at least two memory consumers or shaping seams
  - performance/indexing behavior is covered by tests
- Evidence / test plan:
  - unit tests for lookup/index behavior
  - sample retrieval outputs against fixture or real `.runs/...` artifacts
  - implementation-gate evidence
- Dependencies:
  - can start after `source 0`; ideally before controller work
- Not done if:
  - new memory features still reimplement ad hoc artifact discovery
  - lookup only returns prose summaries with no drill-down pointers
- Rollback / containment:
  - keep helper additive; existing call sites can fall back to legacy discovery temporarily
- Nearby wrong interpretations to reject:
  - "`run-summary.json` alone is enough"
  - "artifact retrieval means dumping whole files into prompts"

### Update 0959
- Recommended labels: `Improvement`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `0959: Upgrade experience reuse to structured refs and non-cloud consumption`
- Problem statement:
  - `0959` currently owns bounded cloud prompt injection of experience snippets, but non-cloud consumers still miss that data and current read paths are largely stringified rather than structured refs.
- Why it matters:
  - fixed-model memory should reuse successful runs consistently across planner/executor/reviewer/delegates, not only in the cloud prompt builder.
- Protected terms / exact surfaces:
  - `experience retrieval`
  - `manifest.prompt_packs[].experiences`
  - `manifest.prompt_packs[].experience_slots`
  - `out/<task-id>/experiences.jsonl`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `orchestrator/src/cli/exec/experience.ts`
  - `orchestrator/src/persistence/ExperienceStore.ts`
- Explicit non-goals:
  - making `0959` the umbrella memory issue
  - redefining the controller/scoring contracts
- Acceptance criteria:
  - experience reuse can be consumed outside the cloud prompt path
  - read path uses structured refs/provenance, not only flattened strings
  - boundedness rules remain explicit
  - tests cover cloud and at least one non-cloud consumption path
- Evidence / test plan:
  - unit/integration tests around prompt-pack experience handling
  - sample manifest with structured experience refs
  - sample consumer artifact showing non-cloud consumption
- Dependencies:
  - after `source 0`
  - preferably after the shared artifact retrieval helper
- Not done if:
  - experience reuse still only exists in cloud prompt text
  - refs are flattened into non-traceable strings before consumption
- Rollback / containment:
  - keep string fallback temporarily while structured refs roll out
- Nearby wrong interpretations to reject:
  - "cloud prompt injection already solved generalized experience retrieval"
  - "learning snapshots and experience reuse are the same thing"

### Update 0954
- Recommended labels: `Improvement`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `0954: Fixed-model memory A/B and pause-resume context-rot execution gate`
- Problem statement:
  - `0954` already owns RLM validation harnesses and long-context fixtures, but it does not yet measure the runtime fixed-model memory outcomes this initiative cares about.
- Why it matters:
  - without a real gate, memory changes will be shaped by anecdotes instead of measurable autonomy/context-rot outcomes.
- Protected terms / exact surfaces:
  - `evaluation/scenarios/`
  - `.runs/<task-id>/cli/<run-id>/manifest.json`
  - `.runs/<task-id>/cli/<run-id>/events.jsonl`
  - `rlm/state.json`
  - `review/telemetry.json`
  - `.runs/<task-id>/metrics.json`
  - `docs/reference/metrics-collab-context-rot.md`
  - `docs/findings/0955-collab-evals-2026-01-22.md`
- Explicit non-goals:
  - changing the model
  - replacing the evaluation harness wholesale
- Acceptance criteria:
  - one fixed-model A/B lane varies only memory configuration/retrieval policy
  - one automated pause/resume continuity scenario measures first-correct-action-after-resume and success-without-manual-state-repair
  - scenario outputs point to manifest/event/memory/review artifacts
  - acceptance criteria are tied to measurable metrics, not prose only
- Evidence / test plan:
  - scenario file(s) under `evaluation/scenarios/`
  - run artifacts under `.runs/...`
  - summarized output under `out/<task-id>/evals/` or `.runs/<task-id>/metrics.json`
- Dependencies:
  - after provenance/outcome schema
  - after initial memory surfaces exist
- Not done if:
  - the lane only measures long-context retrieval correctness
  - pause/resume continuity remains doc-only/rubric-only
- Rollback / containment:
  - keep new eval lanes non-blocking until signal quality is proven
- Nearby wrong interpretations to reject:
  - "`rlm-context-scale` alone proves context rot is solved"
  - "review telemetry equals general autonomy telemetry"

### Conditional Update 0607
- Recommended labels: `Improvement`, `Area: Infra`, `Area: Agents`, `Priority: P2`
- Proposed title: `0607: Add retrieval-facing metadata to learning snapshots if required by the memory controller`
- Problem statement:
  - `0607` already owns snapshot capture, validation, and crystallization. It should only be expanded if controller retrieval truly needs extra structured metadata from `learning.snapshot` or `learning.validation`.
- Why it matters:
  - prevents duplicate learning/snapshot work and keeps this initiative from bloating `0607` unnecessarily.
- Protected terms / exact surfaces:
  - `learning.snapshot`
  - `learning.validation`
  - `docs/TECH_SPEC-continuous-learning-pipeline.md`
  - `orchestrator/src/learning/harvester.ts`
- Explicit non-goals:
  - turning learning snapshots into the runtime memory controller
- Acceptance criteria:
  - only add retrieval-facing fields if a consuming issue demonstrates the need
  - added fields are traceable back to snapshot/validation artifacts
- Evidence / test plan:
  - schema/docs updates
  - one consumer proving the field is needed
- Dependencies:
  - after controller/retrieval design proves the need
- Not done if:
  - `0607` is expanded speculatively with no consuming surface
- Rollback / containment:
  - additive metadata only
- Nearby wrong interpretations to reject:
  - "learning snapshots are the memory controller"

## New Issue Drafts

### New Issue 1
- Recommended labels: `Feature`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `Add source 0 to the run contract and shared memory-consumer read path`
- Problem statement:
  - CO has task docs, manifests, and review context, but no durable `source 0` contract that every role can read the same way.
- Why it matters for autonomous issue/task completion:
  - autonomous runs need a stable anchor that survives planner/executor/reviewer/delegate handoff without degenerating into recency-only restatement.
- Protected terms / exact surfaces:
  - `source 0`
  - `manifest.json`
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `scripts/lib/review-prompt-context.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/rlm/context.ts`
- Explicit non-goals:
  - full memory controller
  - block memory
  - scoring policy
- Acceptance criteria:
  - `memory.source_0` or equivalent additive run-contract field exists and is schema/type backed
  - reviewer, cloud, provider-worker, child-lane, and RLM paths can read it consistently
  - source-0 payload is pointer-based and traceable, not a flattened prose blob
  - tests cover contract creation plus at least two consumer surfaces
- Evidence / test plan:
  - manifest/schema/types diff
  - targeted tests for manifest bootstrap + consumers
  - sample `.runs/<task-id>/cli/<run-id>/manifest.json`
- Dependencies:
  - none
- Not done if:
  - source 0 exists only in one surface
  - source 0 is just a file path or untraceable summary text
- Rollback / containment:
  - additive field only; consumers may fall back to current behavior if absent
- Nearby wrong interpretations to reject:
  - "`source 0` is just a file path"
  - "review prompt context already solves this"

### New Issue 2
- Recommended labels: `Feature`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `Make planner memory selection real instead of leaving TaskContext as dead input`
- Problem statement:
  - the planner seam exists, but `TaskContext` is sparse and `CommandPlanner.plan` currently ignores it. That blocks the memory initiative at the earliest orchestration step.
- Why it matters:
  - if the planner cannot consume selected memory, later controller and retrieval work will arrive too late in the flow.
- Protected terms / exact surfaces:
  - `createTaskContext`
  - `CommandPlanner.plan`
  - `source 0`
  - `orchestrator/src/cli/services/runPreparation.ts`
  - `orchestrator/src/cli/adapters/CommandPlanner.ts`
- Explicit non-goals:
  - introducing final controller/scoring logic here
  - broad planner rewrite
- Acceptance criteria:
  - planner receives a meaningful memory-bearing input
  - the new seam can consume `source 0` and selected memory refs
  - tests prove planner behavior differs when memory input is present vs absent
  - change is additive and bounded
- Evidence / test plan:
  - targeted unit/integration tests for planner path
  - sample manifest/run artifact proving planner consumption
- Dependencies:
  - after or alongside `source 0`
- Not done if:
  - `TaskContext` is still effectively ignored
  - planner memory selection exists only as comments or dead wiring
- Rollback / containment:
  - allow current planner path as fallback until the seam is stable
- Nearby wrong interpretations to reject:
  - "the planner already has meaningful memory because `TaskContext` exists"

### New Issue 3
- Recommended labels: `Feature`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `Emit structured pointer-based block memory from run lifecycle seams`
- Problem statement:
  - CO has terminal/post-run artifacts and symbolic context objects, but no first-class `block memory` or phase-memory artifact spanning planner/executor/reviewer/delegate stages.
- Why it matters:
  - selective attention over execution history needs bounded phase-level memory with drill-down pointers, not only end-state summaries.
- Protected terms / exact surfaces:
  - `block memory`
  - `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`
  - `manifest.json`
  - `events.jsonl`
  - `run-summary.json`
  - `rlm/state.json`
- Explicit non-goals:
  - prose-only summaries
  - replacing existing artifacts
- Acceptance criteria:
  - one additive artifact such as `run-memory.json` or `blocks.jsonl` is emitted
  - entries are pointer-based and traceable to drill-down artifacts
  - at least one consumer reads the artifact
  - lifecycle tests cover write/finalize behavior
- Evidence / test plan:
  - sample emitted artifact under `.runs/<task-id>/cli/<run-id>/`
  - targeted lifecycle tests
- Dependencies:
  - after `source 0`
- Not done if:
  - memory is stored only as prose summaries
  - entries cannot drill down to source artifacts
- Rollback / containment:
  - additive file only; consumers can ignore it until ready
- Nearby wrong interpretations to reject:
  - "`block memory` can be free-form prose with no pointers"

### New Issue 4
- Recommended labels: `Feature`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `Add run memory controller with role-specific retrieval profiles`
- Problem statement:
  - current reviewer/RLM/cloud/provider surfaces all assemble context separately. There is no central `run memory controller` deciding what each role should retrieve.
- Why it matters:
  - without one controller, fixed-model memory remains fragmented, recency-biased, and hard to debug.
- Protected terms / exact surfaces:
  - `run memory controller`
  - `role-specific retrieval`
  - planner / executor / reviewer / delegated subagent prompt builders
  - `scripts/lib/review-prompt-context.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/rlm/prompt.ts`
- Explicit non-goals:
  - final scoring optimization
  - replacing all existing artifacts
- Acceptance criteria:
  - one shared controller exists for selecting candidate memory per role
  - at least planner, reviewer, and one executor/delegate path consume it
  - controller outputs structured refs/provenance, not only flattened text
  - tests cover role-specific differences
- Evidence / test plan:
  - targeted unit tests for controller policy
  - integration proof from at least three consumer surfaces
  - sample controller/provenance artifact under `.runs/...`
- Dependencies:
  - after `source 0`
  - after `block memory`
  - after shared artifact retrieval helper
- Not done if:
  - each role still assembles memory ad hoc
  - role-specific retrieval is only implied in docs
- Rollback / containment:
  - keep per-surface fallback while consumers migrate
- Nearby wrong interpretations to reject:
  - "externalized context alone already gives us the controller"
  - "prompt pack section names equal role-specific retrieval"

### New Issue 5
- Recommended labels: `Feature`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `Add retrieval-stage competitive scoring and anti-dominance normalization`
- Problem statement:
  - current selection is mostly domain/reward/top-K/recency biased. There is no explicit retrieval-stage scoring/diversity policy for memory candidates.
- Why it matters:
  - selective attention over execution history needs scoring that can prefer the right evidence without letting one repetitive source dominate.
- Protected terms / exact surfaces:
  - `competitive scoring`
  - `anti-dominance normalization`
  - `ExperienceStore.fetchTop`
  - `pipelineExperience.ts`
  - `ContextStore.search`
  - `run-manifests.js`
- Explicit non-goals:
  - TF-GRPO training/reward updates
  - changing the model
- Acceptance criteria:
  - retrieval-stage scoring is explicitly defined and implemented
  - dominance penalties/diversity controls are inspectable
  - tests cover repeated-source suppression and ranking changes
  - policy is controller-consumable, not hidden in ad hoc heuristics
- Evidence / test plan:
  - ranking fixtures/unit tests
  - sample provenance artifact showing scores, penalties, accept/reject reasons
- Dependencies:
  - after controller shape exists
- Not done if:
  - selection is still plain top-K reward or recency
  - there is no visibility into why a source was excluded
- Rollback / containment:
  - keep heuristic fallback behind an additive switch while scoring matures
- Nearby wrong interpretations to reject:
  - "`competitive scoring` can just reuse TF-GRPO rewarders unchanged"

### New Issue 6
- Recommended labels: `Feature`, `Area: Infra`, `Area: Agents`, `Priority: P1`
- Proposed title: `Add memory provenance and outcome schema to manifests, events, and metrics`
- Problem statement:
  - current artifacts tell us runs happened, but not enough about which memory was selected, rejected, rediscovered, or manually repaired.
- Why it matters:
  - self-repair and external debugging both need inspectable provenance and outcome metrics before the memory initiative can be trusted.
- Protected terms / exact surfaces:
  - `manifest.json`
  - `events.jsonl`
  - `.runs/<task-id>/metrics.json`
  - `alignment/ledger.jsonl`
  - `alignment/projection.json`
  - `review/telemetry.json`
  - `rlm/state.json`
- Explicit non-goals:
  - building the entire eval lane in this issue
  - introducing verbose transcript dumps as the main debug surface
- Acceptance criteria:
  - additive schema fields exist for contradiction count, rediscovery count, resume latency, manual repair, repeated-failure streak, retrieval hits/misses, and selected-memory provenance
  - at least one event surface emits memory provenance
  - docs/specs describe the fields truthfully
  - tests cover schema emission and absence behavior
- Evidence / test plan:
  - schema/type diffs
  - sample `.runs/.../manifest.json`, `events.jsonl`, and `.runs/.../metrics.json`
  - targeted tests
- Dependencies:
  - after controller/provenance design exists enough to emit real signals
- Not done if:
  - provenance remains prose-only
  - new fields cannot be tied back to source artifacts
- Rollback / containment:
  - additive fields only
- Nearby wrong interpretations to reject:
  - "review telemetry already gives us general autonomy telemetry"
  - "collab event coverage already measures context rot"

## Adjacent But Not Owner Issues
- `0303`: foundational autonomy wrapper/tooling; do not extend directly.
- `0951` / `0961`: `externalized context` / symbolic recursion are already owned.
- `1097` / `1108` / `1207`: standalone-review context transport already owned.
- `0976`: useful prior art on alignment scoring and ledgers, but not the owner for fixed-model memory retrieval/controller work.

## Doc Prerequisites Before Implementation
- Refresh the stale `0303` overview/status story in docs and `tasks/index.json`.
- Truth-align `0940` policy/event claims with shipped runtime.
- Refresh selected issue bodies for `0959`, `0939`, and `0954` before implementation starts.
