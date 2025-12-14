# Technical Spec — README vs Codebase Alignment (Task 0904)

## Objective
Reconcile the GitHub‑facing `README.md` with the actual behavior of the CLI, scripts, and artifact layout in this repo. Where drift reflects an older interface, prefer backwards‑compatible fixes (aliases/shims) over breaking documentation changes.

## Scope
- In scope: `README.md`, wrapper scripts used by documented workflows, and small compatibility changes required to keep docs runnable.
- Out of scope: large refactors, new pipeline features, or changes that require external Codex CLI changes.

## Findings & Proposed Fixes

### 1) `npm run lint` “auto-runs build:patterns” claim is false
- Docs: `README.md` (Development Workflow table) states lint auto-runs `npm run build:patterns`.
- Code: `package.json` defines `lint` as a direct `eslint ...` invocation (no build step).
- Fix options:
  - **A (code):** change `lint` to run `npm run build:patterns` first (or add `prelint`).
  - **B (docs):** update docs to remove the implicit build claim and explicitly document when to run `build:patterns`.
- Recommendation: **A**, because multiple SOP docs describe this as a guardrail and it prevents “missing compiled patterns” failures.

### 2) CLI stage targeting flag mismatch (`--target-stage` vs `--target`)
- Docs: `README.md` says `--target-stage <stage-id>`.
- Code: the CLI accepts `--target <stage-id>` and forwards it to orchestration.
- Fix options:
  - **A (docs):** update docs to use `--target`.
  - **B (compat):** support `--target-stage` as an alias for `--target` and keep `--target` as canonical.
- Recommendation: **B** (plus update docs) to avoid breaking existing muscle memory/scripts.

### 3) Learning snapshot storage path mismatch
- Docs: `README.md` says snapshot copies land at `learning-snapshots/<task>/<run>.tar.gz`.
- Code: snapshots default to `.runs/learning-snapshots/<task>/<run>.tar.gz` (i.e., under the runs root).
- Fix: update docs to reference `.runs/learning-snapshots/...` (or explicitly define “runs root” and keep the relative form consistent).

### 4) Hi‑fi design toolkit “current target” claim does not match repo config
- Docs: `README.md` claims the repo currently targets Ethical Life World.
- Code: `design.config.yaml` has `pipelines.hi_fi_design_toolkit.sources: []` and `compliance/permit.json` only includes `https://abetkaua.com`.
- Fix: update docs to describe that sources are empty by default and must be configured; only claim a “current target” when `sources` and `permit.json` are aligned.

### 5) Hi‑fi toolkit artifact locations are described inconsistently
- Docs: `README.md` says results land under `.runs/<task-id>/cli/<run-id>/` (including artifacts).
- Code: CLI manifests/logs live under `.runs/<task-id>/cli/<run-id>/`, but toolkit artifacts are staged under `.runs/<task-id>/<run-id>/artifacts/...` (plus summaries under `out/<task-id>/design/...`).
- Fix: update docs to explicitly distinguish:
  - CLI run dir (`.runs/<task>/cli/<run>/`) for manifest/logs/command logs
  - TaskManager artifact dir (`.runs/<task>/<run>/artifacts/...`) for staged artifacts

### 6) Mirror workflow staging path mismatch
- Docs: `README.md` says staging is `.runs/<task>/mirror/<project>/<timestamp>/staging`.
- Code: `mirror:fetch` stages into `.runs/<task>/mirror/<project>/<timestamp>/staging/public`.
- Fix: update docs to include `/public`, or adjust the script to stage directly into `staging/` (and update downstream assumptions consistently).

### 7) Metrics recorder path mismatch
- Docs: `README.md` references `metrics/metricsRecorder.ts`.
- Code: the file lives at `orchestrator/src/cli/metrics/metricsRecorder.ts`.
- Fix: update docs to reference the correct path.

### 8) Review workflow docs + `npm run review` do not match current `codex review`
- Docs: `README.md` references `codex review --manifest <latest>`.
- Code: `npm run review` runs a script that invokes `codex review <manifestPath>` and can fall back to an interactive prompt (not valid for non-interactive environments).
- Tooling reality: current `codex review` expects flags like `--uncommitted`, `--base`, or `--commit`; `--manifest` is not a supported option.
- Fix options:
  - **A:** update `npm run review` to call `codex review --uncommitted` (or `--base origin/main`) and pass the manifest path as part of the review prompt text.
  - **B:** keep manifest-driven review but implement it explicitly (e.g., pre-read the manifest and feed key evidence into the prompt) without relying on unsupported CLI flags.
  - **C:** remove interactive fallback unless a TTY is present; otherwise fail with actionable instructions.
- Recommendation: **A + C** (non-interactive safe by default) and update README accordingly.

### 9) Cloud sync is described as if enabled by default
- Docs: `README.md` describes cloud sync as part of the standard flow.
- Code: cloud sync worker/client exist, but there is no default CLI wiring shown; consumers must explicitly start it.
- Fix: update docs to mark cloud sync as an optional integration and document how it’s enabled (or where it is intended to be wired).

### 10) TF‑GRPO diagnostics note wording is inaccurate
- Docs: `README.md` describes a “groupSize ≥ capacity” guardrail.
- Code: the guardrails are “groupSize must be ≥ 2” and “must not exceed fan‑out capacity”.
- Fix: update wording to reflect actual constraints.

## Acceptance Criteria
- Each mismatch above is resolved via code changes, doc changes, or both, with a clear rationale.
- `README.md` command snippets are executable and reflect current flags/paths.
- `npm run review` is non-interactive safe and uses supported `codex review` CLI interfaces.

## Testing Strategy
- Run `node scripts/spec-guard.mjs --dry-run` to ensure guardrails remain satisfied.
- Run `npm run lint` and `npm run test` after changes.
- Add targeted CLI arg parsing tests if we implement `--target-stage` compatibility.

## Evidence
- Task checklist: `tasks/tasks-0904-readme-codebase-alignment.md`
- Run Manifest: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`
