# ACTION PLAN - CO Codex CLI 0.122.0 Posture And Explicit Pin Alignment

## Summary
- Goal: give the parent lane the docs-first packet for CO-269 so it can make a bounded `0.122.0` posture decision and then align explicit workflow pins if warranted.
- Scope: predecessor linkage, exact issue-body surfaces, explicit posture/pin surfaces, and parent-owned validation/decision sequencing.
- Assumptions: live `linear issue-context` is authoritative, and the branch contract plus parent-owned `codex-0122` artifact filenames provide the current local evidence map.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-269`
  - `CO-183`
  - `CO-195`
  - `CO-199`
  - `CO-207`
  - Codex CLI `0.122.0`
  - Codex CLI `0.121.0`
  - Codex CLI `0.118.0`
  - `rust-v0.122.0`
  - `@openai/codex`
  - `CODEX_CLOUD_ENV_ID`
  - `CODEX_CLOUD_CANARY_REQUIRED=1`
  - `CLOUD_CANARY_EXPECT_FALLBACK=1`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/cloud-canary.yml`
  - `tests/pack-smoke.spec.ts`
- Not done if:
  - the predecessor chain is missing
  - the explicit `0.121.0` pin surfaces are not identified
  - `0.122.0` is framed as a date bump instead of an evidence-gated posture decision
  - the docs-review outcome is left ambiguous instead of recording the baseline-only fallback
- Pre-implementation issue-quality review:
  - approved for this child packet only. The packet is bounded, preserves the predecessor contract, and leaves all non-docs work to the parent lane.

## Milestones & Sequencing
1. Draft the six owned packet files for CO-269.
2. Parent reconciles the packet wording against the authoritative CO-269 Linear issue body/workpad and records the docs-review fallback when only repo-baseline docs freshness/spec debt remains.
3. Parent records current/reference/target posture truth across CO-183, CO-195, CO-199, and CO-207.
4. Parent collects or confirms official `rust-v0.122.0`, npm latest `@openai/codex@0.122.0`, and local `codex-cli 0.122.0` evidence.
5. Parent inventories explicit `@openai/codex@0.121.0` pins and the initial floating `cloud-canary` behavior, then classifies which remain compatibility pins and records the final explicit canary policy.
6. Parent reruns runtime-mode and required/fallback cloud-canary evidence for the chosen `0.122.0` decision path, or records the exact blocker evidence.
7. Parent records a single hold/promote decision for `0.122.0`.
8. Parent updates registries, policy docs, workflows, tests, and PR/workpad state only after the posture decision is settled.

## Dependencies
- CO-183 release-note-driven posture audit.
- CO-195 `0.121.0` evidence-gated posture audit.
- CO-199 `0.121.0` sandbox/security classification.
- CO-207 required/fallback cloud-canary gate semantics.
- Parent-owned `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/codex-0122-release-audit/`.
- Parent-owned `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/codex-0122-command-surface/`.
- `.github/workflows/cloud-canary.yml`.

## Validation
- Child-lane checks:
  - protected-term scan across the six owned packet files
  - `git diff --check --` scoped to the six owned packet files
- Parent-lane checks:
  - audited `docs-review` child stream or truthful baseline-only fallback
  - `node scripts/runtime-mode-canary.mjs`
  - required/fallback cloud-canary commands with current `0.122.0` posture intent
  - focused workflow/test validation for any explicit pin changes
  - `npm run pack:smoke` if downstream-facing workflow/package/test pin surfaces change
  - docs-review and implementation/review gates after packet integration
- Rollback plan: if the parent cannot justify `0.122.0` promotion or matching pin updates, keep the current documented posture/pins unchanged and preserve CO-269 as a candidate-only audit packet.

## Risks & Mitigations
- Risk: explicit pins are bumped to `0.122.0` before the posture decision is complete.
  - Mitigation: treat pin alignment as a downstream consequence of the posture decision, not a prerequisite.
- Risk: `cloud-canary` policy remains ambiguous or under-documented after the pin decision, leaving reproducibility weaker than the release-facing workflows.
  - Mitigation: make the `cloud-canary` pin policy an explicit part of the final decision.
- Risk: CO-199 sandbox/security or CO-207 cloud-gate semantics are lost while moving to `0.122.0`.
  - Mitigation: keep both as explicit predecessor constraints in the packet and parent validation plan.
- Risk: the repo's current `0.118.0` / `0.121.0` posture truth is overwritten without recording the intermediate state.
  - Mitigation: keep current/reference/target posture explicit in the packet.

## Approvals
- Docs packet child lane: accepted via `.runs/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3-docs-packet/cli/2026-04-21T01-48-15-998Z-8769df32/manifest.json`.
- Parent docs-review: baseline-only fallback recorded at `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/20260421T023620Z-docs-review-fallback.md`.
- Parent implementation / validation / PR lifecycle: pending parent lane.
- Date: 2026-04-21
