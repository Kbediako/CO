# Codex Brief — AttnRes-Inspired Memory + Autonomy Backlog for CO

## Mission
Research, plan, and seed the CO backlog needed to make the fixed models used by Codex Orchestrator work better on long-horizon autonomous issue and task execution. Use the Attention Residuals paper as systems/design inspiration only. This is **not** a model-retraining initiative.

## Hard constraints
- Do **not** propose foundation-model retraining, fine-tuning, or upstream model-architecture changes outside CO.
- Optimize fixed models through memory architecture, context assembly, retrieval, role routing, evaluation, and observability.
- Follow `AGENTS.md` and `docs/AGENTS.md` docs-first rules.
- Audit and dedupe before creating any issue.
- Prefer small, vertically sliceable issues with concrete acceptance criteria and evidence paths.
- If a capability is already covered by an existing spec/issue, extend or update that artifact instead of cloning it.
- If existing docs are not enough to safely shape the backlog, refresh or add PRD / TECH_SPEC / ACTION_PLAN collateral before or alongside issue creation.
- Use delegated research/planning runs where appropriate and capture manifest-backed evidence.

## First repo audit
Read these first:
- `AGENTS.md`
- `docs/AGENTS.md`
- `docs/README.md`
- `docs/PRD-codex-orchestrator-autonomy.md`
- `docs/TECH_SPEC-codex-orchestrator-autonomy.md`
- `docs/TECH_SPEC-delegation-autonomy-platform.md`
- `docs/TECH_SPEC-delegation-rlm-quick-wins.md`
- `tasks/tasks-0303-orchestrator-autonomy.md`
- `.agent/task/0303-orchestrator-autonomy.md`
- any current Linear-linked docs/specs/issues touching RLM, memory, context rot, review prompts, manifests, events, learning snapshots, or experience injection

Expect relevant implementation surfaces to include some combination of `.runs/<task-id>/...`, `events.jsonl`, `manifest.json`, `rlm/state.json`, context-object artifacts, `packages/orchestrator`, `orchestrator/src/cli`, `packages/shared/*`, review/prompt builders, and experience/learning artifacts. Verify instead of assuming.

## Why this exists
The working hypothesis is that CO’s autonomy ceiling is increasingly limited by how it manages execution history and context, not only by the raw capability of the underlying models. The key AttnRes-style idea to borrow at the CO layer is:

> do not force later reasoning to rely on one uniformly accumulated mixed state.

At the CO systems layer, that means:
- stop treating the latest transcript/log bundle as the main memory
- selectively retrieve the right past artifacts for the current step
- preserve immutable task anchors
- compress history into phase/block memories
- give different CO roles different retrieval widths
- score memories competitively instead of relying on recency
- normalize against large noisy artifacts dominating context
- reuse successful experience in a bounded, evidenceable way

## Protected terms / exact meanings
- `source 0`: the immutable task anchor; at minimum the user-request translation, acceptance criteria, constraints, protected terms, and `done when` definition.
- `block memory`: structured summaries of major run phases with backlinks to raw artifacts; **not** a lossy one-paragraph recap with no drill-down path.
- `run memory controller`: the service/layer that assembles step-time context from anchors, memory blocks, retrieved artifacts, and the local working set.
- `role-specific retrieval`: planner, executor, reviewer, and delegated subagent contexts are intentionally different.
- `competitive scoring`: memories compete for limited prompt budget based on relevance to the current step; this is **not** “append the last N things.”
- `anti-dominance normalization`: long logs/docs cannot dominate selection just because they are large or verbose.
- `experience retrieval`: bounded reuse of prior successful run evidence, not blind replay of old prompts.
- `externalized context`: large context lives in inspectable artifacts/indices, not as a giant in-prompt blob.

## Non-goals
- model retraining, fine-tuning, or changing upstream foundation model internals
- speculative “AI operating system” rewrites disconnected from current CO surfaces
- replacing manifests/events with a brand-new persistence stack
- adopting heavyweight memory infrastructure without proving the need inside current CO workflows
- creating giant umbrella issues that cannot be implemented or validated independently
- expanding Linear or control-plane ownership beyond current CO posture

## Not done if
This initiative is **not** done if any of the following are true:
- issues are created without a repo audit and a delta map against existing docs/specs/issues
- issues duplicate current planned work without a clear merge/update rationale
- issues do not say exactly which CO surface(s) they touch
- issues lack acceptance criteria, evidence expectations, and evaluation hooks
- issues rely on model retraining
- issues describe memory in vague terms without specifying anchor/block/artifact behavior
- there is no evaluation plan tied to autonomy/context-rot outcomes
- the proposal is all research and no shippable vertical slices

## Current → target capability matrix to verify and then use for issue shaping
| Capability | Current posture to verify | Target posture |
| --- | --- | --- |
| Task anchor persistence | Specs/manifests exist but may not be explicitly pinned at step time | Source 0 is always available to step-time context builders |
| Long-context handling | RLM/externalization is partly specified | Step-time context is built from selective retrieval over externalized state |
| Phase history | Events/manifests exist | Major phases emit structured block memories with drill-down backlinks |
| Context assembly | Likely spread across prompts/pipelines | Central run memory controller builds context for each role/step |
| Retrieval policy | Often ad hoc or recency-biased | Competitive, normalized ranking against the current step |
| Role behavior | Planner/executor/reviewer already distinct at pipeline level | Retrieval width and memory composition differ intentionally per role |
| Artifact access | Raw manifests/events/logs exist | Indexed artifact lookup supports block → raw evidence drill-down |
| Experience reuse | Learning snapshots / experience artifacts exist | Bounded successful-run reuse is part of normal context assembly |
| Observability | Runs emit manifests/events | Memory selection decisions are inspectable and measurable |
| Evaluation | General review/metrics exist | Dedicated autonomy + context-rot evals prove improvement |

## Required deliverables from this planning pass
1. A short repo audit that maps existing docs/code/issues against the capability matrix above.
2. A delta map that says:
   - already covered
   - partially covered
   - missing
   - ambiguous / needs research
3. A dependency-ordered backlog proposal.
4. Updated existing issues or new Linear issues for the missing/incomplete work.
5. A brief implementation ordering recommendation that favors early measurable wins over big-bang architecture work.
6. A recommendation on whether this should extend the existing `0303` autonomy track, become a sibling autonomy stream, or spin into a new umbrella.

## How to shape the backlog
Create or update issues across the following workstreams. Split further if needed, but do not merge unrelated surfaces just because they are conceptually adjacent.

### 1) Task anchor / source-0 contract
Goal: define and persist the immutable task anchor that every major step can retrieve.

Expected issue themes:
- define the source-0 schema and minimum contents
- pin source-0 into planner/executor/reviewer contexts
- ensure source-0 survives resume/delegation/review flows

Not done if source 0 is just “the latest spec file path” with no normalized contract.

### 2) Phase/block memory model
Goal: represent major run phases as structured memory blocks with backlinks to artifacts.

Expected issue themes:
- block schema + storage location
- write/update lifecycle at phase boundaries
- backlinking to manifests/events/logs/diffs/tests
- retention and compaction rules

Not done if block memory is only free-form prose and cannot route back to raw evidence.

### 3) Central run memory controller
Goal: add one place that assembles step-time context from source 0, selected blocks, selected artifacts, and local working set.

Expected issue themes:
- context assembly service
- prompt budget contract
- injection surfaces for planner/executor/reviewer/delegates
- feature flag / fallback behavior

Not done if context assembly stays scattered across many bespoke prompt builders.

### 4) Role-specific retrieval profiles
Goal: planner, executor, reviewer, and delegated subagent contexts use different retrieval widths and evidence mixes.

Expected issue themes:
- profile definitions per role
- policy tests showing different composition by role
- prompt integration / manifest audit fields

Not done if every role still sees the same memory bundle.

### 5) Competitive scoring and anti-dominance normalization
Goal: rank candidate memories against current step intent instead of using recency or size.

Expected issue themes:
- scoring-function inputs
- verbosity/size penalties
- duplicate suppression
- normalization rules for large logs / large docs

Not done if large noisy artifacts still dominate prompt inclusion by default.

### 6) Artifact indexing and drill-down retrieval
Goal: make raw evidence discoverable from block memory and current-step needs.

Expected issue themes:
- index manifests/events/logs/tests/diffs/artifacts
- block → artifact lookup path
- lightweight retrieval APIs/helpers

Not done if block memory cannot reliably recover the underlying evidence.

### 7) Long-term experience retrieval
Goal: reuse successful prior-run evidence in a bounded way.

Expected issue themes:
- experience eligibility rules
- retrieval budget + freshness rules
- safe injection into planning/execution prompts
- anti-staleness checks

Not done if old experience is blindly appended or cannot be audited.

### 8) Memory observability and debugging
Goal: make memory selection inspectable so autonomy regressions can be debugged.

Expected issue themes:
- memory selection traces/events
- manifest summaries of what was included and why
- debug views / status surfaces

Not done if operators cannot tell why a step saw a given memory set.

### 9) Evaluation harness for autonomy / context rot
Goal: prove whether the memory changes help.

Expected issue themes:
- benchmark/tasks for long-horizon issue resolution
- metrics for drift, repeated failed attempts, acceptance-criteria misses, and token/context efficiency
- A/B evaluation against current behavior

Not done if memory work ships without measurement.

### 10) Rollout / safety / compatibility
Goal: ship incrementally without destabilizing existing CO runs.

Expected issue themes:
- feature flags
- rollback paths
- compatibility with manifests, reviews, delegation, and RLM docs
- migration plan

Not done if rollout assumes immediate default-on behavior with no escape hatch.

## Candidate issue titles
Use these as seeds, not as a requirement to create one-to-one issues:
- Audit CO context assembly and map AttnRes-inspired memory gaps
- Define source-0 anchor contract for autonomy runs
- Add structured phase/block memory artifacts to `.runs`
- Introduce `RunMemoryController` for step-time context assembly
- Add role-specific memory profiles for planner/executor/reviewer/delegates
- Implement competitive memory scoring with verbosity and duplication penalties
- Add block-to-artifact drill-down retrieval for manifests, events, logs, and diffs
- Integrate bounded successful-run experience retrieval into memory assembly
- Emit memory selection traces and summaries for autonomy debugging
- Add evals for context rot, drift, and autonomous issue completion
- Roll out memory controller behind feature flags with baseline comparisons

## Issue template requirements
Every issue must contain:
- problem statement
- why it matters for autonomous issue/task completion
- exact protected terms / exact surfaces touched
- explicit non-goals
- acceptance criteria
- evidence / test plan
- dependencies or predecessor issues
- `not done if` bullets
- rollback or containment notes when relevant

Prefer issue bodies that make it hard to accidentally implement the wrong thing. Include nearby wrong interpretations to reject.

## Research questions to answer during the audit
Answer these before or while shaping issues:
- Where is step-time context currently assembled for planner, executor, reviewer, and delegated runs?
- Which existing specs already cover externalized context, symbolic RLM, manifests, event streams, or experience reuse?
- Which current artifacts are sufficiently structured to become block-memory inputs today?
- What existing run/eval metrics can measure context rot or autonomy drift, and what new ones are needed?
- Which surfaces are most likely to produce fast wins without a full architecture rewrite?
- Where would memory selection traces be most useful for debugging and review?
- Which issue slices are prerequisites, and which can be parallelized?

## Prioritization rules
Favor:
1. issues that create shared contracts/interfaces used by later work
2. issues that unlock measurement
3. issues that reduce context pollution for current fixed-model runs without requiring a huge migration
4. issues that can ship behind flags and be A/B tested
5. issues that keep raw evidence auditable

Avoid starting with the most ambitious memory layer if smaller contract/eval work would de-risk the design first.

## Evaluation targets
Tie the backlog to measurable outcomes where possible:
- higher autonomous issue completion rate
- fewer repeated failed attempts or replans
- better adherence to source-0 acceptance criteria
- lower context bytes/tokens per successful step
- fewer wrong-file detours
- improved review outcomes / fewer late surprises
- better recovery of earlier constraints during long runs

## Linear issue creation rules
- Use the repo’s current canonical Linear workflow/team/project configuration; do not invent a new destination.
- Update existing issues when they already own the same surface and can absorb the work without becoming ambiguous.
- Create new issues when the delta is substantial or when combining work would violate the small-slice rule.
- Keep titles outcome-oriented, not vague research labels.
- Include repo artifact references (docs/specs/paths) in each issue body.
- If Linear write access is unavailable in the current environment, write issue drafts in markdown with final titles/bodies and clearly mark them ready to paste.

## Output format for this planning pass
At the end of the pass, produce:
1. a `Covered / Partial / Missing` capability table
2. a dependency-ordered issue list
3. the exact issues created/updated or issue drafts prepared
4. the recommended first 3 implementation issues
5. any doc updates required before implementation starts

## Reminder
This is a fixed-model performance initiative. Make CO behave more like it has selective attention over its own execution history. Do not drift into model-training research.
