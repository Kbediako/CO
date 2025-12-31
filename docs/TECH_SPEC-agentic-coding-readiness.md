# Technical Spec — Agentic Coding Readiness & Onboarding Hygiene (Task 0905)

## Objective
Make the repository significantly more suitable for agentic coding by fixing onboarding drift and enabling automated guardrails, without changing orchestrator runtime behavior.

## Scope
- In scope: repository onboarding documentation, task workflow control docs, internal doc link integrity, and CI workflows that run the repo’s core guardrails.
- Out of scope: orchestrator feature work, new pipelines, or refactors not required to support onboarding/CI.

## Findings & Proposed Fixes

### 1) Bootstrap placeholders block "read first" onboarding
- Previous (pre-Task 0905):
  - `.agent/system/*` files were placeholders and did not explain actual repo topology, core packages, or where manifests/evidence live.
  - `.ai-dev-tasks/*` were placeholders ("TODO: replace with upstream file"), but the repo expects them to define the operating loop.
- Resolution:
  - Replace `.agent/system/{architecture,services,api-surface,conventions,database}.md` placeholder text with repo-specific content:
    - what the orchestrator does (`orchestrator/src/**` vs `packages/**`)
    - where run artifacts live (`.runs/**`, `out/**`)
    - which commands are canonical for guardrails and review handoff
  - Replace `.ai-dev-tasks/{create-prd,generate-tasks,process-task-list}.md` with an explicit, non-interactive flow aligned to the repo’s checklist conventions and manifest evidence requirements.
- Status: Completed; see `tasks/tasks-0905-agentic-coding-readiness.md`.

### 2) Stale subagent guidance creates tooling ambiguity
- Previous: older guidance in this workspace, at times, implied non-standard subagent tooling; this repo should be consistently Codex-first.
- Resolution: ensure onboarding/workflow docs standardize on `codex exec` / `codex review` (and `npx codex-orchestrator ...`) for non-interactive review and automation, with no stray references to other subagent CLIs.
- Status: Completed; see `tasks/tasks-0905-agentic-coding-readiness.md`.

### 3) CI guardrails must run on every PR
- Resolution: add a CI workflow (see `.github/workflows/core-lane.yml`) that runs on pull requests and pushes to main:
  - `npm ci`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `node scripts/spec-guard.mjs` with `BASE_SHA` set for PR diffs and `fetch-depth: 0` for reliable history
- Status: Completed; see `.github/workflows/core-lane.yml`.

## Acceptance Criteria
- `.agent/system/*` and `.ai-dev-tasks/*` contain repo-specific guidance (no placeholder “TODO/Describe…” language).
- No references to removed/non-standard subagent tooling remain; guidance uses Codex CLI primitives consistently.
- CI runs on PRs and executes the core lane (build/lint/test/spec-guard) without interactive prompts.
- Documentation references point to real files/commands and match the repo’s current scripts.

Status: Met; see `tasks/tasks-0905-agentic-coding-readiness.md`.

## Testing Strategy
- Local: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.
- CI: verify the workflow triggers on PR and reports status checks.

## Evidence
- Task checklist: `tasks/tasks-0905-agentic-coding-readiness.md`
