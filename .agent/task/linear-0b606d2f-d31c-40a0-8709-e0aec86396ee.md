# Task Checklist - linear-0b606d2f-d31c-40a0-8709-e0aec86396ee

- Linear Issue: `CO-117` / `0b606d2f-d31c-40a0-8709-e0aec86396ee`
- MCP Task ID: `linear-0b606d2f-d31c-40a0-8709-e0aec86396ee`
- Primary PRD: `docs/PRD-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`
- TECH_SPEC: `tasks/specs/linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`, `docs/TECH_SPEC-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`, `docs/ACTION_PLAN-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`, `tasks/specs/linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`, `tasks/tasks-linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`, `.agent/task/linear-0b606d2f-d31c-40a0-8709-e0aec86396ee.md`.
- [ ] docs-review child-stream evidence recorded.
- [ ] Exactly one persistent Linear workpad comment is current.

## Implementation
- [ ] Packaged CLI exposes installable macOS `control-host` supervision commands instead of requiring a copied host-local wrapper.
- [ ] Repo-tracked source does not hard-code a specific user home, repo root, or Homebrew Node path for the shipped path.
- [ ] The runtime preserves env/bootstrap sourcing, explicit runtime selection, health polling, and repeated-unhealthy restart behavior.
- [ ] Failure and restart reasons surface through machine-checkable logs or status output.
- [ ] The supervision contract stays separate from queue-management and merge-policy logic.

## Validation
- [ ] Focused regression coverage exists for CLI parsing/help and supervision install/runtime/state behavior.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness` or explicit repo-baseline fallback recorded.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Standalone review recorded.
- [ ] Explicit elegance pass recorded.
- [ ] `npm run pack:smoke`.

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
