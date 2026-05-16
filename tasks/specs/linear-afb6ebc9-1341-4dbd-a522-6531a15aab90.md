---
id: 20260414-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90
title: CO workflow: add provider adoption eval for source-0, child lanes, and follow-up traceability
status: done
owner: Codex
created: 2026-04-14
last_review: 2026-05-16
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md
related_action_plan: docs/ACTION_PLAN-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md
related_tasks:
  - tasks/tasks-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md
review_notes:
  - 2026-04-14: Bounded child lane created the docs-first packet only. Parent lane owns Linear state, workpad, PR lifecycle, source-payload verification, implementation, and acceptance.
  - 2026-04-14: Issue-quality review approved the scope as an eval contract, not an implementation slice; packet preserves source anchor, protected terms, non-goals, Not Done If, acceptance criteria, and sanitized-fixture constraints.
  - 2026-04-14: Parent implementation added `scripts/provider-linear-adoption-eval.mjs`, sanitized fixtures under `evaluation/fixtures/provider-linear-adoption/`, and focused regressions under `evaluation/tests/provider-linear-adoption.test.ts`.
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; live `node bin/codex-orchestrator.js linear issue-context --issue-id afb6ebc9-1341-4dbd-a522-6531a15aab90 --format json` verified CO-176 is Linear Done/completed and attached/related PR evidence https://github.com/Kbediako/CO/pull/473. No completed_at was inferred or fabricated.
---

# Technical Specification

## Context

CO-176 asks for a provider adoption eval that proves three adoption behaviors together:

1. The provider uses the handed-off `memory/source-0` and `prompt-pack` context, including the protected source anchor `ctx:sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d#chunk:c000001`.
2. The provider applies parallel-first same-issue child-lane policy with machine-checkable decision, launch, declared ownership, and parent acceptance/reject/invalidate proof.
3. The provider preserves autonomous follow-up, link, and workpad traceability without relying on live Linear mutation in the eval.

This child lane is docs-only. It creates the packet and registry mirrors so the parent can import the patch and launch implementation/eval work from the authoritative issue workspace.

## Requirements

1. Add a sanitized fixture contract for `memory/source-0` and `prompt-pack` usage:
   - preserve source pointer, object id, source payload path, and prompt-pack references;
   - require deterministic proof that the provider used the fixture inputs;
   - prevent fixture content from including secrets, PII, or unredacted live issue transcripts.
2. Add a parallel-first same-issue child-lane eval contract:
   - require `linear parallelization --decision parallelize_now|stay_serial|forbid_parallel` evidence;
   - require safe-candidate reasoning when `parallelize_now` is expected;
   - require `linear child-lane --action launch|accept|reject|invalidate` lifecycle evidence;
   - require launch proof, bounded file/phase ownership, and parent outcome proof.
3. Add autonomous follow-up/link/workpad traceability assertions:
   - model workpad records, PR/issue links, follow-up issue references, and parent-owned mutation boundaries as structured fixture data;
   - require trace IDs or stable artifact references from provider output to expected fixture records;
   - reject prose-only traceability claims.
4. Preserve parent authority and existing workflow vocabulary:
   - no eval path may mutate live Linear state;
   - no eval path may weaken parent acceptance authority or parent-owned Linear mutation;
   - no eval path may relabel metric-only child-lane evidence as adoption proof.
5. Keep the implementation bounded to eval and adoption-proof surfaces selected by the parent lane.

## Issue-Shaping Contract
- User-request translation carried forward: create the CO-176 docs-first packet for a provider adoption eval covering `memory/source-0/prompt-pack` usage, parallel-first same-issue child-lane decisions and launch/acceptance proof, plus autonomous follow-up/link/workpad traceability.
- Protected terms / exact artifact and surface names: `memory/source-0`, `source-0/source.txt`, `prompt-pack`, `ctx:sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d#chunk:c000001`, `sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d`, `linear parallelization --decision parallelize_now|stay_serial|forbid_parallel`, `linear child-lane --action launch|accept|reject|invalidate`, `launch/acceptance proof`, `autonomous follow-up`, `link traceability`, `workpad`, `sanitized fixture`.
- Nearby wrong interpretations to reject: generic provider prompt evaluation, source-less adoption metrics, live Linear smoke tests, unsanitized real payload fixtures, child-lane runtime redesign, parent-owned mutation bypass, or implementation in this child lane.
- Explicit non-goals carried forward: no implementation/eval code edits in the docs-first child lane, no Linear mutation helpers, no full repo validation suites, no PR lifecycle actions, and no live source payload expansion into docs.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Source and prompt-pack adoption | Source-0 and prompt-pack data can be available to provider runs, but adoption may be inferred from run narrative. | CO-176 requires explicit provider adoption proof. | Eval uses sanitized fixtures and fails without source-anchor and prompt-pack provenance in the expected output. |
| Same-issue child lanes | Parallel-first policy and child-lane lifecycle vocabulary exist from nearby workflow lanes. | Provider adoption must prove policy use, not only policy presence. | Eval covers decision, launch, ownership, and accept/reject/invalidate proof. |
| Follow-up and workpad traceability | Parent/provider flows can create workpad and link artifacts. | Autonomous follow-up must remain auditably linked to source context and parent decisions. | Eval asserts stable trace references and parent-owned workpad/link boundaries without live mutation. |
| Privacy | Real runs can contain operational context. | Eval fixtures must be safe and deterministic. | Fixtures are sanitized, minimal, and local/CI safe. |

## Readiness Gate
- Not done if: the eval can pass without source-0/prompt-pack proof, without child-lane decision and lifecycle proof, without follow-up/link/workpad trace references, or with live Linear mutation / unsanitized payloads.
- Pre-implementation issue-quality review evidence: approved from the CO-176 handoff on 2026-04-14. The issue is not narrower than the user request because the packet includes source/prompt-pack adoption, child-lane decision/lifecycle proof, autonomous follow-up/link/workpad traceability, and privacy constraints.
- Safeguard ownership split: parent lane owns source-payload verification, Linear state, workpad, PR lifecycle, implementation, eval execution, and patch acceptance. This child lane owns only docs-first packet and registry mirror files.

## Technical Requirements
- Functional requirements: implement an eval that checks source-anchor usage, prompt-pack reference handling, child-lane decision/launch/outcome proof, and follow-up/link/workpad traceability against sanitized fixtures.
- Non-functional requirements: deterministic local/CI behavior, no live Linear APIs, no secrets/PII fixtures, stable output suitable for review artifacts, and no weakening of existing provider-worker or child-lane semantics.
- Interfaces / contracts: fixture fields should include source anchor metadata, prompt-pack references, provider input/output, parallelization decision record, child-lane lifecycle record, parent outcome record, workpad/link references, follow-up references, and privacy/sanitization marker.

## Architecture & Data
- Architecture / design adjustments: `scripts/provider-linear-adoption-eval.mjs` replays one fixture directory at a time, loading `manifest.json`, `provider-linear-worker-proof.json`, and `prompt-artifacts.json`, then emitting a report under `out/<task>/provider-linear-adoption-eval.json`.
- Fixture design: each fixture is trimmed to pointer metadata and synthetic summaries only. The evaluator derives metrics for `memory.source_0`, selected prompt pack, prior-experience source run or missing-experience reason, planner `selectedMemoryRefs`, parallelization decision/reason, child-lane launch and acceptance state, and follow-up/link/workpad traceability.
- Runtime behavior: no provider-worker scheduling, Linear mutation, child-lane shell, or memory-controller behavior changes were needed.
- Data model changes / migrations: no persistent migration expected. Fixture schema should be local test data only.
- External dependencies / integrations: no live Linear integration in eval; use sanitized local fixture data.

## Validation Plan
- Tests / checks: future implementation should run focused eval tests for source/prompt-pack adoption, child-lane lifecycle proof, and follow-up/workpad/link traceability; parent should then run docs-review and implementation-gate per CO workflow.
- Rollout verification: save eval output under `out/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90/` or the parent-selected task output path, with fixture privacy confirmation.
- Monitoring / alerts: future provider adoption audits can compare eval proof coverage with real-run evidence, but live adoption audits are outside this lane.

## Open Questions
- Resolved: eval command is `npm run eval:provider-adoption`; script path is `scripts/provider-linear-adoption-eval.mjs`; fixture root is `evaluation/fixtures/provider-linear-adoption/`.
- Resolved: parent verified the handoff source payload path in the authoritative workspace and matched `sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d`.

## Approvals
- Reviewer: pending docs-review / parent review
- Date: pending
