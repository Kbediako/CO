# Technical Spec - Slimdown Refactor Cycle 2 (Task 0102-slimdown-cycle-2)

Source of truth for requirements: this TECH_SPEC; `tasks/tasks-0102-slimdown-cycle-2.md` is the operational checklist.

## Scope Summary
- Continue slimdown after the Phase 6 closeout by shrinking unused surface area and removing low-risk indirection.
- Keep changes incremental, net-negative, and evidence-backed (net-negative applies to deletion/refactor PRs; docs-only and characterization-test PRs may be net-positive within diff budget).
- Preserve public CLI behavior, pipeline IDs, and user-facing strings.
- No new dependencies or broad refactors; deletions and small mechanical consolidations only.
- Target diff budget: <= 500 net lines per PR.

## Consolidation Targets

### 1) Dead surface pruning (scripts, pipelines, workflows)
- Remove scripts that are no longer referenced in repo (repo-wide search; include but not limited to `docs/**`, `.agent/**`, `tasks/**`, `.github/workflows/**`, `package.json` scripts, `codex.orchestrator.json`).
- Remove unused pipeline definitions only when:
  - No in-repo references exist (repo-wide search excluding `.runs/**` and generated output), and
  - No usage signals appear in `.runs/**` history.
- Remove workflows only when:
  - No in-repo references or `workflow_call`/`uses` links, and
  - No GitHub Actions runs in the last 90 days (record evidence), and
  - Not required for branch protection / required checks (confirm in repo settings or with maintainer).
  - If the workflow has `schedule:`, `release:`, tag triggers, or other rare/manual triggers, treat “no runs in 90 days” as insufficient; require maintainer sign-off or keep a wrapper/alias.
  - If any check is uncertain, keep a stable wrapper workflow (alias) instead of deleting.
- If a pipeline ID appears “public-ish,” provide an alias/deprecation window before removal.
  - Public-ish if referenced in docs, `package.json` scripts, CI workflow names/dispatch inputs, or appears in `.runs/**` outside this task namespace.
  - Mechanism: keep an alias to the old ID for at least one cycle; no user-facing output text changes.
  - Minimum window: one slimdown cycle (or until the next cycle closes).
  - Acceptance: capture old-ID `--format json` output pre-change, then run old ID and new ID post-change; compare normalized outputs (ignore run IDs/timestamps/durations/manifest paths). Old-ID before/after must match on stage graph, display name, user-visible labels, and the old pipeline id; old vs new may exclude/normalize the pipeline id but must match on the other fields.
  - Alias implementation: keep a thin pipeline entry in `codex.orchestrator.json` with the old ID pointing at the new pipeline stages.

### 2) Indirection cleanup (barrels/shims)
- Target `index.ts` barrels or single-file re-export shims that:
  - Have low fan-in (≤ 5 import sites; measure with repo-wide `rg` on the import path),
  - Are internal-only (not part of published entrypoints/exports; record proof), and
  - Do not hide cycles that would reappear when removed.
- Do one directory per PR; update imports mechanically only.

### 3) CLI scaffolding consolidation (internal only)
- Consolidate duplicated internal helpers (manifest path selection, output formatting, run-id discovery) without changing output text.
- Add characterization tests before refactors to lock down CLI outputs (assert exit code, stdout/stderr routing, and normalize dynamic fields like run IDs/timestamps or compare structured JSON).
- Phase 3 should be two PRs: (a) characterization tests only (net-positive allowed), then (b) refactor/consolidation (must be net-negative).

### 4) Packaging + CI/workflow contraction
- Tighten pack allowlists to remove unused runtime assets while keeping `dist/` parity.
- Consolidate repeated workflow setup via reusable workflows, keeping stable wrapper names where referenced by docs.
- Capture before/after `npm pack --dry-run` file list diff; required assets/exports must remain, and removals must be justified.
- Pack smoke requirement: pack tarball, install into a temp project, run a minimal import/require against the top-level package entry, run the CLI with `--help`/`--version`, and confirm at least one documented export path resolves.
- Preserve workflow triggers, permissions, wrapper filenames, and required check contexts (workflow `name:` + job display names); preserve top-level job ids or set explicit job `name:` values to keep contexts stable, and keep wrapper workflows when moving logic to reusable workflows; preserve workflow interface contracts (`workflow_dispatch` inputs + `workflow_call` inputs/secrets/outputs) or provide a wrapper translation; validate YAML diffs and check names maintain parity.

## Do-not-touch list (explicitly retained)
- `scripts/status-ui-build.mjs` is still referenced; do not remove or rename.
- Stable pipeline IDs (`diagnostics`, `docs-review`, `implementation-gate`, `frontend-testing`) remain unchanged.

## Evidence & Inventory Rules
- Phase-specific evidence requirements:
  - Phase 1 (dead surface pruning): proof requirements by artifact type (pipelines/scripts = 2-part; workflows = 3-part).
  - Phase 2 (barrels/shims): fan-in evidence (≤ 5 import sites) + guardrails green.
  - Phase 3 (CLI scaffolding): characterization tests added first + no string diffs + guardrails green.
- Proof requirements (Phase 1) by artifact type:
  - Pipelines (2-part): repo-wide search (excluding `.runs/**` + generated output) + no `.runs/**` usage signals.
  - Scripts (2-part): no in-repo invocations (repo-wide search including workflows/package scripts/orchestrator/docs) + `.runs/**` command log scan (0 hits).
  - Workflows (3-part): repo-wide search (including `workflow_call`/`uses`) + no Actions runs in last 90 days + not required checks.
- Inventory evidence should be recorded in task docs before deletion PRs.
- Evidence capture template (per candidate):
  - Repo-wide `rg --hidden --no-ignore-vcs "<candidate>" -g'!.runs/**' -g'!dist/**' -g'!build/**' -g'!node_modules/**' -g'!.git/**' -g'!coverage/**' -g'!tasks/tasks-0102-slimdown-cycle-2.md' -g'!docs/TASKS.md' -g'!.agent/task/0102-slimdown-cycle-2.md' -g'!path/to/definition'` (0 hits; exclude definition file via `-g'!path/to/definition'`, and record definition path separately).
  - `.runs/**` scan (e.g., `rg --hidden --no-ignore -n "<id>" .runs`) with 0 hits.
  - Date + reviewer initials.
  - Paste the exact command used into the evidence log and confirm clean worktree for that capture (`git status --porcelain` empty).
  - For workflows: record Actions run history window + required-check confirmation + check context list (branch protection or recent run).
- Evidence searches must exclude non-repo artifacts (e.g., `node_modules/`, caches) or be run from a clean worktree. Mentions inside cycle evidence logs do not count as in-repo references for deletion eligibility.
- Prefer aliases over removals for anything that may be externally invoked.

## Testing Strategy
- Baseline runs (Phase 0) (assumes `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` is set):
  - `codex-orchestrator start diagnostics --format json`
  - `codex-orchestrator start docs-review --format json`
  - Optional: `codex-orchestrator start implementation-gate --format json`
  - `codex-orchestrator start frontend-testing --format json` (required when touching pipelines/workflows/packaging assets; otherwise optional)
  - Subagent inventory run: `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2-inventory npx codex-orchestrator start diagnostics --format json` (manifest under `.runs/0102-slimdown-cycle-2-inventory/cli/<run-id>/manifest.json`).
  - Capture baseline pack file list: `npm pack --dry-run` (record file list in task evidence).
- For code changes, run the full guardrail chain:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- For changes touching pipelines/workflows/packaging, run `codex-orchestrator start frontend-testing --format json` post-change and record the manifest.

### Normalization recipe (for evidence comparisons)
- Orchestrator `--format json` (example):
  - `node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(0,'utf8')); delete o.runId; delete o.startedAt; delete o.finishedAt; delete o.durationMs; delete o.manifestPath; console.log(JSON.stringify(o, null, 2));"`
  - If array ordering varies, sort arrays before stringify (document the command used in the Evidence Log).
- CLI characterization:
  - Prefer structured JSON output when available; otherwise normalize dynamic tokens (run IDs/timestamps/paths) with regex before diffing.

## Risks & Mitigations
- Removing code still used by external automation.
  - Mitigation: alias window + evidence of disuse before deletion.
- Output drift in CLI commands.
  - Mitigation: characterization tests and no string edits.
- Packaging regressions (missing assets).
  - Mitigation: pack smoke tests and clean worktree validation.
- Workflow behavior drift.
  - Mitigation: keep wrapper workflow filenames stable; compare manifests.

## Documentation & Evidence
- Mirror updates in `docs/TASKS.md`, `tasks/tasks-0102-slimdown-cycle-2.md`, and `.agent/task/0102-slimdown-cycle-2.md` once manifests exist.
- Add new documents to `docs/docs-freshness-registry.json` with current review dates.
- Record approvals/escalations in `tasks/index.json` when maintainer sign-off is required.
