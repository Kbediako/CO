# Task Checklist - linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f

- Linear Issue: `CO-390` / `b7074b86-3d38-4dfe-baa9-73b2cc8d686f`
- MCP Task ID: `linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f`
- Registry Task ID: `20260426-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f`
- Primary PRD: `docs/PRD-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`
- Task spec: `tasks/specs/linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`

## Docs-First
- [x] PRD drafted for CO-390 release detection and canonical release intake. Evidence: `docs/PRD-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`.
- [x] TECH_SPEC drafted with protected wording, current/reference/target matrix, and parent-owned intake requirements. Evidence: `docs/TECH_SPEC-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`, `tasks/specs/linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`.
- [x] ACTION_PLAN drafted for posture-neutral release-intake sequencing. Evidence: `docs/ACTION_PLAN-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`.
- [x] Registry mirrors updated in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: declared registry files.
- [x] Task checklist and `.agent` mirror drafted inside the allowed lane scope. Evidence: `tasks/tasks-linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`, `.agent/task/linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f.md`.

## Source / Assumptions
- [x] Parent-provided source anchor preserved. Evidence: `ctx:sha256:458c1773dc00d4b3c070ab6ce8919e6b73816c6d2a2fc0f4903ebf3b075386e5#chunk:c000001`.
- [x] Source payload absence recorded without widening into Linear reads or mutation. Evidence: attempted read of `.runs/linear-b7074b86-3d38-4dfe-baa9-73b2cc8d686f-docs-packet/cli/2026-04-26T20-01-07-605Z-d09f221a/memory/source-0/source.txt` returned missing, and `find . -path '*/memory/source-0/source.txt' -print` returned no paths.
- [x] Local version-policy and workflow-pin surfaces used only as comparison context. Evidence: `docs/guides/codex-version-policy.md`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/cloud-canary.yml`, `tests/pack-smoke.spec.ts`.

## Packet Content
- [x] Protected wording preserved across packet files. Evidence: upstream Codex CLI release detection, canonical release-intake triggering, GitHub release truth, npm `@openai/codex` dist-tags/time, CO version-policy target, workflow pins, one canonical Linear intake issue, CO-386 release-intake template.
- [x] Current/reference/target truth distinguishes detection from adoption. Evidence: PRD and TECH_SPEC parity/alignment matrix sections.
- [x] Non-goals reject version promotion, workflow pin updates, implementation edits, child-lane Linear mutation, and duplicate intake issues. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and task spec.

## Validation
- [x] Protected-term scan covers packet files. Evidence: local scoped `rg -n 'CO-390|upstream Codex CLI release detection|canonical release-intake triggering|GitHub release truth|npm \`@openai/codex\` dist-tags/time|CO version-policy target|workflow pins|one canonical Linear intake issue|CO-386 release-intake template' ...`.
- [x] Registry JSON parse passes. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`.
- [x] Scoped diff/whitespace checks pass. Evidence: `git diff --check -- tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json` and a node trailing-whitespace scan across all declared files.
- [x] Changed-file scope review confirms no edits outside declared files. Evidence: local `git status --porcelain` comparison returned `scope ok`.

## Handoff Status
- [x] Child lane left workspace changes in place for parent patch export. Evidence: uncommitted docs/task registry diff in this lane.
- [ ] Parent reconciles against authoritative Linear issue/workpad state and CO-386 template. Evidence: pending parent lane.
- [ ] Parent runs docs-review and owns implementation/validation/PR lifecycle. Evidence: pending parent lane.
