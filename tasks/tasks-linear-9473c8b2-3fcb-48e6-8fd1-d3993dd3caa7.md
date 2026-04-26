# Task Checklist - linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7

- Linear Issue: `CO-381` / `9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7`
- MCP Task ID: `linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7`
- Primary PRD: `docs/PRD-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- TECH_SPEC: `tasks/specs/linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`
- Source anchor: `ctx:sha256:788ef44aebc402efe831ec3c10edf00a79653a06d72a8a43cc83c841572629b6#chunk:c000001`
- Docs packet manifest: `.runs/linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7-docs-packet/cli/2026-04-26T00-20-46-760Z-f04d6b8b/manifest.json`

## Docs-First
- [x] Source payload availability checked. Evidence: child workspace has no `.runs` directory, so the referenced `source-0/source.txt` payload is unavailable locally; packet is anchored on the parent handoff and source anchor.
- [x] PRD drafted for CO-381 runtime fallback `auto` and `strict` policy split. Evidence: `docs/PRD-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, shared fallback policy contract, and likely runtime/router/provider-worker/control-host surfaces. Evidence: `tasks/specs/linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`, `docs/TECH_SPEC-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, focused tests, validation floor, standalone review, elegance review, and PR handoff. Evidence: `docs/ACTION_PLAN-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`.
- [x] TECH_SPEC registered in `tasks/index.json` with `last_review: 2026-04-26`. Evidence: `tasks/index.json`.

## Protected Contract
- [x] Protected terms preserved: `auto`, `strict`, selected policy, original target, fallback target, and blocking reason. Evidence: PRD, canonical TECH_SPEC, and ACTION_PLAN.
- [x] Non-goals preserved: no new runtime modes, no default runtime flip, no removal of CLI break-glass, no broad cloud fallback rewrite, and no source/test edits in this child lane.
- [ ] Parent docs-review confirms the packet is not narrower than CO-381.

## Parent-Owned Implementation
- [ ] Parent implements shared policy normalization for `auto` and `strict`.
- [ ] Parent wires policy truth through runtime provider, execution route state, manifest mutation, local route summaries/status, provider-worker proof, and control-host/read-model projections.
- [ ] Parent adds focused runtime/provider/router tests for `auto` fallback and `strict` fail-fast behavior.
- [ ] Parent adds focused provider-worker/control-host tests for selected policy, original target, fallback target, and blocking reason projection.
- [ ] Parent runs validation floor for production/source changes.
- [ ] Parent runs standalone review and addresses actionable findings.
- [ ] Parent runs elegance/minimality review before PR handoff.
- [ ] Parent handles PR lifecycle and Linear/workpad updates.

## Validation
- [x] JSON parse check for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json ok')"` returned `tasks/index.json ok`.
- [x] Scoped diff review confirms no edits outside declared file scope. Evidence: `git status --short`, `git diff --name-only`, and `git ls-files --others --exclude-standard` show only declared CO-381 docs/checklist paths plus `tasks/index.json`.
- [ ] Parent validation floor before PR handoff.

## Progress Log
- 2026-04-26: bounded same-issue docs child lane created the CO-381 docs-first packet and task registration only.

## Notes
- Do not call Linear mutation helpers from this lane.
- Do not edit production source or tests from this lane.
- Do not run full repo validation suites from this lane.
