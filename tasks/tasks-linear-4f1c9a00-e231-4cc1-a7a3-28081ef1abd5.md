# Task Checklist - CO-506 require full fallback metadata for legacy bounded-success review guidance

## Added by Traceability Packet 2026-05-06

## Context
- Linear issue: `CO-506`
- Linear issue id: `4f1c9a00-e231-4cc1-a7a3-28081ef1abd5`
- MCP Task ID: `linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5`
- Source issue: `CO-478` / `f3aec8da-23c6-459e-acba-a5045b404c7f`
- Source PR: `#782`
- Primary PRD: `docs/PRD-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- TECH_SPEC: `tasks/specs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- Agent mirror: `.agent/task/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- Canonical owner key: `review-wrapper:bounded-success-legacy-fallback-metadata`
- Summary of scope: docs-first packet plus implementation requiring full retained-fallback metadata before accepting `legacy succeeded payload` bounded-success review guidance.

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing evidence.

### Backlog Hold
- [x] Backlog hold reason captured. Evidence: PRD, canonical TECH_SPEC, ACTION_PLAN, and this checklist state that CO-506 is held because packet and registry setup were missing before Backlog promotion.
- [x] `backlog_head_follow_up_traceability_pending` clearance condition captured. Evidence: PRD, canonical TECH_SPEC, ACTION_PLAN, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` define packet/registry setup as the clearance evidence only.

### Evidence Gates
- [x] Issue-quality review captured (pre-implementation). Evidence: `tasks/specs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md` carries protected terms, wrong interpretations, explicit non-goals, parity matrix, and Not Done If clauses.
- [x] Fallback / refactor decision captured (pre-implementation). Evidence: `tasks/specs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md` expires the legacy succeeded payload acceptance path unless full retained-fallback metadata is present.
- [x] Durable retention evidence captured. Evidence: PRD and TECH_SPEC state that modern `review_outcome: bounded-success` remains successful bounded wrapper completion while clean handoff still requires `review_verdict: clean`.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker review outcome guidance | `legacy succeeded payload` with preserved `termination_boundary` can be treated as successful bounded review completion without full retained-fallback metadata. | expire fallback | CO-506 / `review-wrapper:bounded-success-legacy-fallback-metadata` | A legacy review telemetry payload has `status: succeeded` and preserved `termination_boundary` but lacks modern `review_outcome` / `review_verdict` fields. | 2026-05-06 | 2026-05-06 | 2026-06-05 | Remove legacy succeeded payload support, or require owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence before accepting the legacy path. | `ProviderLinearWorkerRunner` prompt regressions, `docs/standalone-review-guide.md` wording, telemetry fixture tests only if runtime interpretation changes, docs checks, standalone review. |

- Large-refactor check: a narrow guidance/test implementation is acceptable because the unsafe seam is a single legacy compatibility interpretation, not a split authority across review execution, semantic verdict parsing, and provider-worker handoff.
- Minor-seam decision: the retained compatibility handling is acceptable only as this bounded guidance/test seam, and it expires unless the full retained-fallback metadata set is present.

- [x] Packet validation captured. Evidence: JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`, `git diff --check`, new-file `git diff --no-index --check`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness` passed on 2026-05-06.
- [x] Docs-review captured. Evidence: `.runs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5/cli/2026-05-06T19-30-14-566Z-97a6084f/manifest.json` and `review/telemetry.json` report `gpt-5.5`, `xhigh`, `review_outcome=clean-success`, `review_verdict=clean`, and `finding_count=0`.
- [x] Provider-worker guidance/tests shipped. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, `docs/standalone-review-guide.md`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, child lane `.runs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5-tests-metadata/cli/2026-05-06T19-38-15-847Z-223befb3/manifest.json`, and `npm run test:core -- orchestrator/tests/ProviderLinearWorkerRunner.test.ts` passed 325 tests.
- [ ] PR review handoff evidence captured. Evidence: pending implementation lane.

### Protected Terms
- [x] `review/telemetry.json`
- [x] `status: succeeded`
- [x] `review_outcome: bounded-success`
- [x] `legacy succeeded payload`
- [x] `preserved termination_boundary`
- [x] `review_verdict`
- [x] `retained-fallback metadata`
- [x] `owner`, `trigger`, `introduced date`, `review date`, `maximum lifetime or expiry`, `removal condition`, `reason`, `validation evidence`

### Progress Log
- 2026-05-06: Created the CO-506 docs-first packet and registry mirrors only on branch `kb/co-506-traceability-packet`; no provider-worker source, Linear, or GitHub PR lifecycle changes were made.
- 2026-05-06: Packet records `stay_serial` / `packet_only_helper_scope` because the work is a single traceability packet with tightly coupled mirror updates and no separable implementation stream.
- 2026-05-06: Packet validation passed: JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`, `git diff --check`, new-file `git diff --no-index --check`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness`.
- 2026-05-06: Docs-review passed clean with `gpt-5.5` / `xhigh`: `.runs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5/cli/2026-05-06T19-30-14-566Z-97a6084f/manifest.json`.
- 2026-05-07: Implementation updated provider-worker prompt guidance, bundled Linear skill guidance, and standalone-review guide wording so retained legacy succeeded payload handling requires owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence. Same-issue child lane `tests-metadata` added focused prompt regressions and was accepted; focused ProviderLinearWorkerRunner tests passed 325 tests.

## Parent Tasks
1. Register traceability packet.
   - Files: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
   - Acceptance: `backlog_head_follow_up_traceability_pending` has repo-side packet and registry evidence.
   - [x] Status: Complete. Evidence: files and mirrors listed above.
2. Validate packet.
   - Acceptance: lightweight docs/JSON validation passes or exact blockers are recorded.
   - [x] Status: Complete. Evidence: JSON parse, `git diff --check`, new-file whitespace check, spec guard, docs check, docs freshness, and docs-review passed on 2026-05-06.
3. Implement retained-fallback metadata guidance.
   - Files: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, `docs/standalone-review-guide.md`, and `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
   - Acceptance: `legacy succeeded payload` acceptance requires owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence.
   - [x] Status: Complete. Evidence: files listed above and focused test pass.
4. Preserve CO-478 review semantics.
   - Acceptance: `review_verdict` remains clean-handoff authority; command-intent, bounded-review, and `termination_boundary` guards are unchanged.
   - [x] Status: Complete. Evidence: ProviderLinearWorkerRunner prompt regression asserts findings/unknown blockers and `review_verdict: clean` remains required for clean handoff.
5. Parent-owned review and handoff.
   - Files: parent lane manifests, workpad, PR, and review artifacts.
   - Acceptance: validation, review feedback, ready-review drain, and Linear handoff complete in the implementation lane.
   - [ ] Status: Pending.

## Relevant Files
- `docs/PRD-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- `docs/TECH_SPEC-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- `docs/ACTION_PLAN-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- `tasks/specs/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- `tasks/tasks-linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- `.agent/task/linear-4f1c9a00-e231-4cc1-a7a3-28081ef1abd5.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `skills/linear/SKILL.md`
- `docs/standalone-review-guide.md`

## Notes
- CO-506 is a packet-first follow-up from CO-478 / PR #782.
- This implementation does not change Codex review CLI exit-code behavior or weaken semantic `review_verdict` gating.
- Remaining work is validation/review/PR handoff, not source implementation.
