# ACTION_PLAN - CO-398 control-host status fallback projection expiry

## Summary
- Goal: create the CO-398 docs-first packet and registry mirrors for the `control-host status surfaces` fallback-expiry lane.
- Scope: packet files, task checklist mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows only.
- Assumptions:
  - Linear issue CO-398 is the source of truth for protected wording and packet prefix.
  - CO-382 fallback-expiry policy applies because control-host status projection is a governed high-churn surface.
  - Parent owns all implementation and Linear lifecycle work after the packet exists.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `control-host status surfaces`
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
  - `legacy proof fields`
  - `selected-run projection fallback`
  - `compatibility issue projection fallback`
  - `CLI/API/UI status source authority`
- Not done if:
  - the docs packet omits or renames any protected term
  - legacy proof/status fallback paths remain indefinite with no owner and removal condition
  - CLI/API/UI status projections still disagree and the parent adds another fallback to mask disagreement
  - `/ui/data.json` truth or source labels are weakened
  - audit-visible legacy proof is removed without focused projection tests
  - the packet lane edits implementation files
- Pre-implementation issue-quality review:
  - 2026-04-27: micro-task path is unavailable because correctness depends on exact protected wording, exact projection surfaces, and fallback-expiry classification.
  - 2026-04-27: the packet keeps CO-398 narrower than provider issue authority consolidation and broader than a single presenter cleanup.
- Fallback / refactor decision:
  - `remove fallback`: synthetic status/identity fallback that hides source disagreement.
  - `expire fallback`: selected-run projection fallback and compatibility issue projection fallback.
  - `justify retaining fallback`: source-labeled legacy proof visibility and CLI/API/UI authority/proof labels.
- Durable retention evidence:
  - contract name: control-host status audit proof and source-label projection
  - owning surface: `control-host status surfaces`
  - steady-state proof expected from parent: live authority, retained proof, source labels, degraded reasons, and `/ui/data.json` truth stay distinct
- Large-refactor check:
  - no large refactor in this packet lane
  - parent may keep a minor seam only if it removes or expires local fallback paths without adding another authority source
  - parent should escalate to CO-400 if implementation needs a new provider issue current-state authority model

## Milestones & Sequencing
1. Create the CO-398 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the canonical task id in `tasks/index.json`.
3. Add a current CO-398 snapshot to `docs/TASKS.md`.
4. Add docs freshness registry rows for the six CO-398 packet/checklist surfaces.
5. Validate edited JSON, protected terms, `docs:check`, and `docs:freshness`.
6. Report branch, worktree, changed files, validation output, and blockers without pushing or opening a PR.

## Parent-Owned Follow-On Plan
1. Parent reconciles live CO-398 issue context and current `origin/main`.
2. Parent runs docs-review before implementation.
3. Parent inventories status fallback paths in `compatibilityIssuePresenter.ts`, `providerIssueObservability.ts`, `selectedRunProjection.ts`, and `controlRuntime.ts`.
4. Parent removes synthetic fallback behavior that hides CLI/API/UI/status source disagreement.
5. Parent adds expiry metadata for retained selected-run and compatibility projection bridges.
6. Parent preserves source labels, audit-visible proof, degraded reasons, and `/ui/data.json` truth.
7. Parent reruns focused projection tests, normal validation, review, Linear workpad, PR lifecycle, and merge gates.

## Dependencies
- Linear issue `CO-398`
- Parent issue `CO-382`
- `docs/guides/fallback-expiry-and-refactor-policy.md`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index ok')"`
  - `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('docs freshness registry ok')"`
  - `rg -n "control-host status surfaces|fallback expiry|large refactor|minor seam|remove fallback|expire fallback|justify retaining fallback|legacy proof fields|selected-run projection fallback|compatibility issue projection fallback|CLI/API/UI status source authority" ...`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `git diff --name-only`
- Parent-owned validation commands:
  - focused projection tests for the four protected control-host surfaces
  - `npx codex-orchestrator co-status --format json`
  - control-host API / `/ui/data.json` fixture checks
  - normal validation floor and review loop
- Rollback plan:
  - revert only the CO-398 packet and registry mirror rows if packet validation fails; implementation remains untouched in this packet lane

## Risks & Mitigations
- Risk: CO-398 is interpreted as permission to hide disagreement behind another status fallback.
  - Mitigation: packet requires disagreement to surface with source labels and degraded reasons.
- Risk: durable audit proof becomes hidden authority.
  - Mitigation: packet classifies legacy proof visibility as source-labeled audit evidence, not live authority.
- Risk: worker lane drifts into implementation or CO-400 authority consolidation.
  - Mitigation: ownership scope excludes implementation files and names CO-400 as the escalation lane for larger authority refactors.

## Approvals
- Docs-first packet: parent orchestrator, 2026-04-27
- Parent docs-review / implementation approval: pending
