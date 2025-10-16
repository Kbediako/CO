---
id: 20251016-learning
title: Codex-Orchestrator Learning Library Seed
relates_to: tasks/0001-prd-codex-orchestrator.md
risk: low
owners:
  - Orchestrator Engineering
last_review: 2025-10-16
---

## Added by Orchestrator 2025-10-16

## Summary
- Objective: Stand up the initial Codex learning library with reusable codemods, lint rules, and response templates aligned with orchestrator guardrails.
- Scope: Provide two TypeScript codemods, one ESLint rule, and a template bundle surfaced by a versioned `patterns/index.json`.
- Constraints: Assets must be deterministic, compile via `npm run build:patterns`, and testable through `npm test -- patterns` so they are safe to sync into Codex Cloud libraries.

## Proposed Assets
1. Codemod — `structured-event-emit`
   - Converts legacy `eventBus.emit('event', payload)` calls into structured objects (`eventBus.emit({ type: 'event', payload })`) to standardize event telemetry.
2. Codemod — `ensure-run-summary-fields`
   - Adds `mode` and `timestamp` fields to run summary object literals when missing, guaranteeing persistence consistency before manifests are written.
3. Linter Rule — `prefer-logger-over-console`
   - Disallows `console.*` usage in orchestrator source and suggests the shared logger, reinforcing observability requirements.
4. Templates
   - `templates/implementation-summary.md`: Builder hand-off skeleton referencing SOP checkpoints.
   - `templates/run-manifest-checklist.md`: Reviewer checklist ensuring manifest artifacts are captured.

## Implementation Notes
- Directory structure: `patterns/{codemods,linters,templates}` with TypeScript sources compiled to `dist/patterns/**`.
- Metadata: `patterns/index.json` captures asset id, version, description, category, and usage instructions for ingestion tooling.
- Build tooling: Dedicated `patterns/tsconfig.json` extends the root config; `npm run build:patterns` invokes `tsc -p patterns/tsconfig.json`.
- Testing: Vitest suites under `patterns/**/__tests__` validate codemods via `jscodeshift` helpers and lint rules via ESLint RuleTester. Command: `npm test -- patterns`.
- Documentation: `patterns/README.md` provides quick-start guidance and links templates; each template includes front-matter describing when to apply it.

## Risk & Mitigations
- Transformation regressions — Mitigated by fixture-based tests covering positive/negative cases and publishing before/after examples in README tables.
- Drift between assets and orchestrator codebase — Mitigated by tracking semantic versions in `patterns/index.json` and recording changes in run manifests.
- Template misuse — Clear usage notes and TODO callouts reduce accidental direct commits without customization.

## Validation Plan
- Execute `npm run build:patterns` to ensure codemods compile to CommonJS consumers.
- Execute `npm test -- patterns` to run codemod and linter rule suites.
- Capture outputs in `.runs/4/<timestamp>/` manifests for sync.

## Approvals
- Product — Jordan Lee (Approved 2025-10-16)
- Engineering — Priya Desai (Approved 2025-10-16)
- Design/DX — Mateo Alvarez (Approved 2025-10-16)
