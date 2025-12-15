# Technical Spec — Agentic Coding Readiness & Onboarding Hygiene (Task 0905)

## Objective
Make the repository significantly more suitable for agentic coding by fixing onboarding drift and enabling automated guardrails, without changing orchestrator runtime behavior.

## Scope
- In scope: repository onboarding documentation, task workflow control docs, internal doc link integrity, and CI workflows that run the repo’s core guardrails.
- Out of scope: orchestrator feature work, new pipelines, or refactors not required to support onboarding/CI.

## Findings & Proposed Fixes

### 1) Bootstrap placeholders block “read first” onboarding
- Current:
  - `.agent/system/*` files are placeholders and don’t explain actual repo topology, core packages, or where manifests/evidence live.
  - `.ai-dev-tasks/*` are placeholders (“TODO: replace with upstream file”), but the repo expects them to define the operating loop.
- Fix:
  - Replace `.agent/system/{architecture,services,api-surface,conventions,database}.md` placeholder text with repo-specific content:
    - what the orchestrator does (`orchestrator/src/**` vs `packages/**`)
    - where run artifacts live (`.runs/**`, `out/**`)
    - which commands are canonical for guardrails and review handoff
  - Replace `.ai-dev-tasks/{create-prd,generate-tasks,process-task-list}.md` with an explicit, non-interactive flow aligned to the repo’s checklist conventions and manifest evidence requirements.

### 2) Stale subagent guidance creates tooling ambiguity
- Current: the repo had an extra subagent doc that implied a non-standard CLI dependency and diverged from the Codex-first workflow used elsewhere in this workspace.
- Fix: remove the stale doc and any references to it; standardize on `codex exec` / `codex review` for non-interactive review and automation.

### 3) CI guardrails are not enabled (example-only workflow)
- Current: `.github/workflows/spec-guard.example.yml` exists but doesn’t run on PRs/push; repo health relies on local discipline.
- Fix: add a CI workflow that runs on pull requests and pushes to main:
  - `npm ci`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `node scripts/spec-guard.mjs` with `BASE_SHA` set for PR diffs and `fetch-depth: 0` for reliable history

## Acceptance Criteria
- `.agent/system/*` and `.ai-dev-tasks/*` contain repo-specific guidance (no placeholder “TODO/Describe…” language).
- No references to removed/non-standard subagent tooling remain; guidance uses Codex CLI primitives consistently.
- CI runs on PRs and executes the core lane (build/lint/test/spec-guard) without interactive prompts.
- Documentation references point to real files/commands and match the repo’s current scripts.

## Testing Strategy
- Local: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.
- CI: verify the workflow triggers on PR and reports status checks.

## Evidence
- Task checklist: `tasks/tasks-0905-agentic-coding-readiness.md`
