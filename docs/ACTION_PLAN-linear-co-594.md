# ACTION_PLAN - CO-594 consolidate Linear backlog and Ponytail refactor

## Summary
- Goal: pass docs-first review, then land bounded behavior-preserving Ponytail simplifications for CO.
- Scope: CO-594 packet, Linear provenance, posture evidence, audit, bounded implementation slices, validation and review.
- Assumptions: Linear access remains available; `CO-594` is canonical; `CO-588` remains historical; source issues are not bulk-mutated.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs-first`, `behavior-preserving`, `Linear access`, `canonical issue/spec packet`, `Ponytail full`, `smallest reviewable changes`, `subagents`, `docs-review`.
- Not done if: implementation starts before docs-review, source issue provenance is missing, or simplification weakens gates/contracts.
- Pre-implementation issue-quality review: local Linear inventory plus subagent inventory agrees that `CO-594` is the new canonical owner, with project scope `CO Control and Advisory` and adjacent no-project issues `CO-591`/`CO-550`.
- Fallback / refactor decision: touched current-facing posture fallback expires; selected implementation seams must be removed or collapsed, not retained.
- Durable retention evidence: source Linear issues remain retained provenance and future owner boundaries; this is historical traceability, not a runtime fallback.
- Large-refactor check: no new architecture layer is warranted; CO-594 removes selected stale seams and leaves broader CO architecture refactors to separately owned lanes.
- Minor seam: no new minor seam is retained; selected implementation seams are removed rather than extended.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current-facing Codex posture docs | Local `0.140.0` evidence is newer than canonical CO-590 `0.135.0` policy, but release-intake gates have not promoted it. | justify retaining fallback | CO-594 / CO-590 | Touched docs/specs discuss current CLI posture. | 2026-06-17 | 2026-06-17 | 30 days | A release-intake lane promotes `0.140.0`, or touched docs stop naming observed smoke as current adopted posture. | CLI feature commands and docs-review. |
| Delegation config TOML parsing | Missing `@iarna/toml` dependency triggered a custom subset parser fallback in `orchestrator/src/cli/config/delegationConfig.ts`. | remove fallback | CO-594 | Repo already declares `@iarna/toml`, and peer TOML consumers fail fast when it cannot load. | 2026-06-17 | 2026-06-17 | Immediate | Custom subset parser deleted; supported installs parse through declared dependency. | `npx vitest run --config vitest.config.core.ts orchestrator/tests/DelegationConfig.test.ts`; required checks. |
| Review wrapper command-intent recovery | Expired CO-485 legacy `sandbox_mode="read-only"` retry after `default_permissions=":read-only"` rejection. | remove fallback | CO-594 / CO-485 | `codex review` command-intent retry is blocked because the active CLI rejects `default_permissions`. | 2026-05-02 | 2026-06-17 | Expired 2026-06-01 | No third legacy sandbox retry is attempted; wrapper fails closed with no new `legacy_fallback_*` launch context while preserving the original command-intent termination boundary. | `npx vitest run --config vitest.config.core.ts tests/review-launch-attempt.spec.ts`; `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts`; final standalone review and pack smoke. |

- Contract name: local Codex posture evidence boundary.
- Owning surface: CO-594 docs packet and CO-590 version policy.
- Steady-state proof: touched docs distinguish observed local `0.140.0` smoke from canonical public `0.135.0` policy.
- Tests/docs: `codex --version`, `codex features list`, CO-594 docs-review, and CO-590 policy references.
- Non-expiring rationale: the posture boundary is a documented release-intake contract, not a temporary runtime fallback; promotion requires a separate release-intake lane.

## Milestones & Sequencing
1. Create CO-594 docs-first packet and registry entries.
2. Run docs-review to terminal status.
3. Complete Ponytail audit and refactor plan subagent streams. Done: selected CO-594-owned dependency-missing TOML fallback removal and expired CO-485 review-wrapper sandbox retry removal.
4. Implement the smallest safe slices after docs-review. Done: custom subset parser deleted from delegation config parsing; expired legacy sandbox retry deleted from review-wrapper command-intent recovery.
5. Run required validation, standalone review, and elegance pass. Done: required checks passed; final review contract was clean; elegance recheck had no findings.
6. Report final diff, checks, and residual blockers without pushing or merging.

## Dependencies
- Linear connector for issue provenance.
- OpenAI docs MCP for current model guidance.
- Multi-agent tools for inventory, posture, audit, implementation, and validation streams.
- CO local validation scripts.

## Validation
- Checks / tests: docs-review first; focused `DelegationConfig.test.ts`, `review-launch-attempt.spec.ts`, and `run-review.spec.ts` passed in implementation lanes; delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff-budget with explicit CO-579/CO-594 override, standalone review, elegance pass, and pack:smoke passed because CLI/config/review-wrapper behavior was touched.
- Rollback plan: revert only CO-594 local branch changes made in this run; do not touch source issue state or parent checkout.

## Risks & Mitigations
- Risk: backlog consolidation becomes another process-heavy artifact. Mitigation: CO-594 packet is concise and implementation must delete/shrink.
- Risk: `xhigh` default conflicts with latest guidance. Mitigation: keep `xhigh` only for this hardest async agentic lane; avoid broad prompt migration.
- Risk: docs-review finds packet drift. Mitigation: fix docs packet before implementation.

## Approvals
- Docs-review: passed. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/manifest.json`.
- Final standalone review: passed clean in enforce mode with a valid contract and 0 findings. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/review/telemetry.json`.
- Elegance review: passed after the telemetry classification fix. Evidence: subagent `019ed3d0-3c38-7801-a08c-fad3599a0b56`.
- Date: 2026-06-17.
