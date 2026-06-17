# ACTION_PLAN - CO-594 consolidate Linear backlog and Ponytail refactor

## Summary
- Goal: pass docs-first review, then land bounded behavior-preserving Ponytail simplifications for CO.
- Scope: CO-594 packet, Linear provenance, posture evidence, audit, bounded implementation slices, validation and review.
- Assumptions: Linear access remains available; `CO-594` is canonical; `CO-588` remains historical; source issues are not bulk-mutated.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs-first`, `behavior-preserving`, `Linear access`, `canonical issue/spec packet`, `Ponytail full`, `smallest reviewable changes`, `subagents`, `docs-review`.
- Not done if: implementation starts before docs-review, source issue provenance is missing, or simplification weakens gates/contracts.
- Pre-implementation issue-quality review: local Linear inventory plus subagent inventory agree that `CO-594` is the new canonical owner, with project scope `CO Control and Advisory` and adjacent no-project issues `CO-591`/`CO-550`.
- Fallback / refactor decision: touched current-facing posture fallback expires; selected implementation seams must be removed or collapsed, not retained.
- Durable retention evidence: source Linear issues remain retained provenance and future owner boundaries; this is historical traceability, not a runtime fallback.
- Large-refactor check: defer broad CO architecture refactors until the Ponytail audit proves a small slice cannot safely reduce bloat.

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
