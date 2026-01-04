# Task Checklist - Slimdown Refactor Cycle 2 (0102-slimdown-cycle-2)

> Set `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0102-slimdown-cycle-2.md`. Flip `[ ]` to `[x]` only with appropriate evidence (file existence for drafting; manifests for runs/guardrails/deletions).

## Constraints
- Target diff budget: <= 500 lines net per PR.
- Net-negative diffs required for deletion/refactor PRs (delete > add). Docs-only and characterization-test PRs may be net-positive within the diff budget.

## Guardrail Chain (required for code changes)
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`

## Checklist

### Documentation
- [ ] PRD drafted - Evidence: `docs/PRD-slimdown-cycle-2.md`.
- [ ] Tech spec drafted - Evidence: `docs/TECH_SPEC-slimdown-cycle-2.md`.
- [ ] Action plan drafted - Evidence: `docs/ACTION_PLAN-slimdown-cycle-2.md`.
- [ ] Freshness registry updated - Evidence: `docs/docs-freshness-registry.json`.

### Phase 0 Evidence
- [ ] Diagnostics manifest captured (baseline) - Evidence: `.runs/0102-slimdown-cycle-2/cli/<run-id>/manifest.json` (record pipeline name + run id).
- [x] docs-review manifest captured (baseline) - Evidence: `.runs/0102-slimdown-cycle-2/cli/2026-01-04T13-46-59-386Z-05090c17/manifest.json`.
- [ ] implementation-gate manifest captured (optional baseline) - Evidence: `.runs/0102-slimdown-cycle-2/cli/<run-id>/manifest.json` (record pipeline name + run id).
- [ ] frontend-testing manifest captured (required when touching pipelines/workflows/packaging; optional baseline) - Evidence: `.runs/0102-slimdown-cycle-2/cli/<run-id>/manifest.json` (record pipeline name + run id).
- [ ] Baseline pack file list captured (`npm pack --dry-run`) - Evidence: task doc entry or note.
- [ ] Baseline required check contexts captured (workflow file path + workflow `name:` + job ids + job names + context string) - Evidence: branch protection or recent run note.

### Phase 0 Runbook (kickoff + inventory)
0) Confirm clean worktree before evidence capture (`git status --porcelain` empty).
1) Run baseline manifests: diagnostics + docs-review (optional implementation-gate).
2) Spawn subagent inventory run (`MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2-inventory npx codex-orchestrator start diagnostics --format json`) and capture evidence.
3) Record Phase 1 candidate deletions with two proofs of disuse + evidence template (repo-wide `rg --hidden --no-ignore-vcs "<candidate>" -g'!.runs/**' -g'!dist/**' -g'!build/**' -g'!node_modules/**' -g'!.git/**' -g'!coverage/**' -g'!tasks/tasks-0102-slimdown-cycle-2.md' -g'!docs/TASKS.md' -g'!.agent/task/0102-slimdown-cycle-2.md' -g'!path/to/definition'`, plus `.runs/**` scan via `rg --hidden --no-ignore -n "<id>" .runs` + date/initials).

### Phase 1 Runbook (dead surface pruning)
1) Pick 1-3 items with proof requirements by artifact type (pipelines/scripts = 2-part; workflows = 3-part):
   - Pipelines: repo refs + `.runs/**` usage.
   - Workflows (3-part proof): repo refs + Actions run history (last 90 days; e.g., `gh run list --workflow <file>` output recorded) + required-check confirmation (branch protection screenshot/link or maintainer note). If `schedule:`, `release:`, tag, or other rare/manual triggers exist, require maintainer sign-off or keep a wrapper/alias.
   - Scripts (2-part): no in-repo invocations (repo refs incl. workflows/package scripts/orchestrator/docs) + `.runs/**` command log scan (0 hits).
2) Update docs/workflows/package scripts in the same PR.
3) Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` and record `.runs/.../manifest.json` in the Evidence Log.
4) If the PR touches pipelines/workflows/packaging, run `codex-orchestrator start frontend-testing --format json` post-change and record the manifest.
5) If an alias is introduced, capture old-ID `--format json` output pre-change, then run old + new pipeline IDs post-change; record alias window start/end + output comparison (normalize run IDs/timestamps/durations/manifest paths; old-ID before/after must keep the old pipeline id; old vs new may exclude/normalize pipeline id; verify display name/stage labels match).

### Phase 2 Runbook (indirection cleanup)
1) Remove one low-fan-in barrel/shim directory (fan-in ≤ 5; measure with repo-wide `rg` on import path).
2) Confirm the barrel/shim is not part of published entrypoints/exports; record proof.
3) Update imports mechanically; avoid formatting churn.
4) Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` and record `.runs/.../manifest.json` in the Evidence Log.

### Phase 3 Runbook (CLI scaffolding consolidation)
0) Phase 3 is two PRs: 3a tests-only (net-positive allowed), 3b refactor (must be net-negative).
1) Add characterization tests for CLI output (assert exit code, stdout/stderr routing, normalize run IDs/timestamps).
2) Extract one helper at a time in the refactor PR; preserve output strings.
3) Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` and record `.runs/.../manifest.json` in the Evidence Log.

### Phase 4 Runbook (packaging + workflow contraction)
0) Execute as two PRs unless trivially small: 4a packaging allowlist/pack smoke, 4b workflow refactor/reuse.
1) Tighten pack allowlists; run pack smoke in a clean worktree and record before/after `npm pack --dry-run` diff with justified removals.
   - Pack smoke definition: pack tarball, install into a temp project, run a minimal import/require against the top-level entry, run CLI `--help`/`--version`, and confirm at least one documented export path resolves.
2) Consolidate workflow setup via reusable workflows with stable wrappers; preserve workflow name + job display names/check contexts, preserve top-level job ids or explicit job `name:` values (keep wrapper workflows when moving logic to reusable workflows), and preserve workflow interface contracts (`workflow_dispatch` inputs + `workflow_call` inputs/secrets/outputs) or provide wrapper translation.
3) Verify required check contexts unchanged post-change (compare baseline context strings to a post-change run or maintainer-provided list).
4) Run guardrail chain (see Guardrail Chain section), then run `codex-orchestrator start diagnostics --format json` (and `codex-orchestrator start docs-review --format json` if docs changed) with `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` and record `.runs/.../manifest.json` in the Evidence Log.
5) If the PR touches pipelines/workflows/packaging, run `codex-orchestrator start frontend-testing --format json` post-change and record the manifest.

### Phase 4 Evidence
- [ ] Pack file list diff recorded + removals justified - Evidence: before/after `npm pack --dry-run` list note.
- [ ] Workflow check contexts preserved (workflow `name:` + job display names unchanged; wrapper filenames and top-level job ids/explicit names preserved; interface contracts unchanged) - Evidence: before/after list or YAML diff note + recorded check context strings from branch protection or recent run.

### Delegation
- [ ] Subagent inventory run captured - Evidence: `.runs/0102-slimdown-cycle-2-inventory/cli/<run-id>/manifest.json`.

### Validation + Handoff
- [ ] Mirrors updated in `docs/TASKS.md`, `tasks/tasks-0102-slimdown-cycle-2.md`, `.agent/task/0102-slimdown-cycle-2.md`.
- [ ] Do-not-touch list verified unchanged (`scripts/status-ui-build.mjs` + stable pipeline IDs).
- [ ] Approvals/escalations recorded in `tasks/index.json` when maintainer sign-off is required.

## Evidence Log
### Baseline Manifests
- Diagnostics: (run-id + manifest path)
- docs-review: 2026-01-04T13-46-59-386Z-05090c17 (`.runs/0102-slimdown-cycle-2/cli/2026-01-04T13-46-59-386Z-05090c17/manifest.json`)
- Implementation-gate (optional): (run-id + manifest path)
- frontend-testing (if applicable): (run-id + manifest path)

### Phase 1–4 Manifests
- Diagnostics/docs-review run-ids per phase (post-change)
- frontend-testing run-id when applicable (post-change)

### Guardrail Chain Evidence
- CI run link or terminal output summary per tranche/PR

### Pack Dry-Run Baseline
- Baseline `npm pack --dry-run` list: (link or pasted list)

### Required Check Contexts Baseline
- Workflow file path + workflow `name:` + job ids + job names + context string (branch protection UI/`gh` API or recent run; maintainer note if access restricted)

### Phase 1 Candidates (Two Proofs)
- Candidate list + repo-wide `rg --hidden --no-ignore-vcs` summary (excluding definition files; paste exact command)
- `.runs/**` scan summary (`rg --hidden --no-ignore`; paste exact command)
- Clean worktree confirmation (`git status --porcelain` empty) for each capture
- Mentions inside cycle evidence logs do not count as in-repo references.
- Workflow-only: Actions history + required-check confirmation (gh output + branch protection evidence)

### Alias Windows
- Old ID → new ID, window start/end, manifests, and `--format json` output comparison (pre-change old-ID vs post-change old-ID keeps old pipeline id; old vs new may exclude pipeline id)
- Normalization command used for JSON comparisons (paste exact command)

### Phase 4 Checks
- Pack list diff + justified removals
- Workflow check context evidence (workflow name + job display names)
