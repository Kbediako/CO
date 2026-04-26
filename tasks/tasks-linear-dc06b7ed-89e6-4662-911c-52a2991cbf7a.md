# Task Checklist - linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a

- Linear Issue: `CO-337` / `dc06b7ed-89e6-4662-911c-52a2991cbf7a`
- MCP Task ID: `linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a`
- Primary PRD: `docs/PRD-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`
- TECH_SPEC: `tasks/specs/linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`

## Docs-First
- [x] PRD drafted for the CO-337 `0.123.0` posture-and-marketplace-correction lane. Evidence: `docs/PRD-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, parent/child ownership split, and validation plan. Evidence: `tasks/specs/linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`, `docs/TECH_SPEC-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`.
- [x] ACTION_PLAN drafted for evidence first, corrected-surface implementation second, and release-pin decision last. Evidence: `docs/ACTION_PLAN-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`.
- [ ] Registry mirrors updated in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Task checklist and `.agent` mirror drafted. Evidence: `tasks/tasks-linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`, `.agent/task/linear-dc06b7ed-89e6-4662-911c-52a2991cbf7a.md`.
- [ ] Parent docs-review evidence recorded.

## Evidence
- [x] Live Linear issue context inspected before any state transition attempt. Evidence: packaged `linear issue-context --issue-id dc06b7ed-89e6-4662-911c-52a2991cbf7a --format json`.
- [x] Pre-turn decomposition matrix recorded and required parallelization decision logged. Evidence: Linear workpad draft plus packaged `linear parallelization`.
- [x] Same-issue docs child lane launched with bounded file ownership. Evidence: packaged `linear child-lane --action launch --stream marketplace-docs ...`.
- [x] Official `rust-v0.123.0` release facts located. Evidence: GitHub release `rust-v0.123.0`.
- [x] Local `0.123.0` and versioned `0.121.0` / `0.122.0` / `0.123.0` marketplace command surfaces captured with timestamps. Evidence: parent command logs for `codex --help`, `codex exec --help`, and `npx @openai/codex@<version> ...`.

## Implementation
- [ ] `scripts/pack-smoke.mjs` detects and invokes the supported marketplace add path truthfully.
- [ ] `tests/pack-smoke.spec.ts` reflects the corrected marketplace truth and final workflow policy.
- [ ] Workflow pin policy is kept or changed with explicit corrected-surface evidence.
- [ ] Delegated docs/message files are updated and reconciled from the child patch.
- [ ] `rust-v0.123.0` deltas are classified into adopt / hold / no-op buckets for CO.

## Validation
- [ ] Docs-review child stream recorded, or truthful baseline-only fallback documented.
- [ ] Targeted `vitest` for `tests/pack-smoke.spec.ts` passes.
- [ ] Workflow-matched `npm run pack:smoke` passes on a post-`0.121.0` candidate, or the failure is explicitly recorded and justifies the pin hold.
- [ ] Required repo validation floor passes for the final diff.
- [ ] Standalone review completed.
- [ ] Elegance review completed.

## Notes
- Parent must avoid `README.md`, `docs/public/downstream-setup.md`, `docs/guides/codex-version-policy.md`, and `plugins/codex-orchestrator/launcher.mjs` while the child lane is active.
- Do not weaken `pack:smoke` or cloud-canary gates to make newer Codex versions appear green.
