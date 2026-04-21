# ACTION_PLAN - CO: rebaseline marketplace-dependent downstream-smoke policy beyond Codex CLI 0.121.0

## Summary
- Goal: close `CO-275` by recording the post-`0.121.0` marketplace-smoke decision against current `origin/main`.
- Current decision: use the `CO-268` replacement contract, `@openai/codex@0.122.0` plus `codex plugin marketplace add`, instead of keeping release-facing smoke pinned to `@openai/codex@0.121.0` and old `codex marketplace add`.
- Guardrail: marketplace smoke remains mandatory by default; local non-coverage skips still require explicit reason evidence.

## Steps
1. Merge current `origin/main` and resolve conflicts toward the merged `CO-268` command-surface contract.
2. Update the `CO-275` docs/checklist packet so it records the replacement decision instead of the earlier hold-on-`0.121.0` draft.
3. Keep `CO-196`, `CO-217`, and `CO-269` explicit in the closeout record.
4. Confirm current `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, and the protected workflows align on `codex plugin marketplace add` and `@openai/codex@0.122.0`.
5. Run focused validation, then required repo gates appropriate for the final tracked diff.
6. Refresh the Linear workpad before review or Done handoff.

## Validation
- Protected-term scan for: `Codex CLI 0.122.0`, `Codex CLI 0.121.0`, `codex marketplace add`, `codex plugin marketplace add`, `pack:smoke`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `@openai/codex@0.121.0`, `@openai/codex@0.122.0`, `CO-196`, `CO-217`, and `CO-269`.
- Focused pack-smoke workflow tests.
- Full validation gates before PR/review handoff if this branch opens a PR.

## Risks
- Risk: accidentally reverts the merged `CO-268` policy back to the old `0.121.0` smoke pin.
  - Mitigation: resolve implementation conflicts from `origin/main` and keep CO-275 as a lineage/decision packet.
- Risk: loses `CO-217` mandatory coverage lineage.
  - Mitigation: keep marketplace skip/fail semantics explicit in docs and workpad closeout.
- Risk: confuses marketplace smoke contract with active CO target promotion.
  - Mitigation: state that active target promotion remains out of scope.
