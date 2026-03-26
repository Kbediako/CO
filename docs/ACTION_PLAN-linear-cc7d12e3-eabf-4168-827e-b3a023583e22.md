# ACTION_PLAN - CO Align Non-Interactive Standalone Review Policy Across Gate, Advisory, and Provider-Worker Lanes

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-12` / `cc7d12e3-eabf-4168-827e-b3a023583e22`
- Linear URL: https://linear.app/asabeko/issue/CO-12/co-align-non-interactive-standalone-review-policy-across-gate-advisory

## Summary
- Goal: finish Linear issue `CO-12` by defining one explicit unattended standalone-review lane policy and aligning the config, docs, skill, and provider-worker closeout contract to match it.
- Scope: docs-first packet, Symphony/CO baseline audit, pre-implementation docs-review, bounded policy/runtime/docs changes, focused contract tests, validation, PR prep, and review handoff.
- Assumptions:
  - the wrapper's current prompt-only non-interactive behavior is intentional and should remain the raw default unless a lane explicitly forces execution
  - `docs-review` and `implementation-gate` should stay forced
  - `docs-relevance-advisory` should stay prompt-only/advisory
  - provider-worker closeout should become an explicit autonomous-forced standalone-review lane before `In Review`
  - subagent spawning remains unavailable in-session, so delegation must be explicitly overridden

## Milestones & Sequencing
1) Register the docs-first packet for `linear-cc7d12e3-eabf-4168-827e-b3a023583e22`, update `tasks/index.json`, update `docs/TASKS.md`, mirror the checklist, and capture the Symphony/CO baseline audit note.
2) Run docs-review with an explicit delegation override for this worker run before touching implementation code.
3) Patch `codex.orchestrator.json` so the unattended lane matrix is explicit: gate review stages stay forced, advisory review stays prompt-only, and provider-worker runs explicitly opt into forced standalone review behavior.
4) Patch provider-worker guidance and repo docs/skill text so the same matrix is explicit in `AGENTS.md`, `docs/AGENTS.md`, `docs/standalone-review-guide.md`, `skills/standalone-review/SKILL.md`, and `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
5) Add focused contract coverage proving the unattended policy split and provider-worker forced-review path.
6) Run validation, refresh the docs packet/workpad, prepare the PR, and stop coding once the issue reaches `In Review`.

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/README.md`
- `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
- `codex.orchestrator.json`
- `AGENTS.md`
- `docs/AGENTS.md`
- `docs/standalone-review-guide.md`
- `skills/standalone-review/SKILL.md`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." npx codex-orchestrator start docs-review --format json --no-interactive --task linear-cc7d12e3-eabf-4168-827e-b3a023583e22`
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the provider-worker env/prompt changes if they force review outside the chosen lane contract
  - revert the docs/config matrix if it causes gate/advisory drift rather than clarifying it
  - keep the issue in an active workflow state until the fix or blocker is explicit

## Risks & Mitigations
- Risk: the docs/config wording could still leave provider-worker review ambiguous.
  - Mitigation: make the provider-worker prompt and pipeline env explicit, then pin it with tests.
- Risk: changing unattended policy text could accidentally imply the wrapper was previously broken.
  - Mitigation: state clearly that handoff-only behavior remains intentional for raw/advisory lanes.
- Risk: focused policy changes could drift from the shipped pipeline config later.
  - Mitigation: add contract coverage in the config/prompt test seams instead of relying only on prose.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T07-21-52-956Z-12d6b412/manifest.json`
- Date: 2026-03-25

## Manifest Evidence
- Baseline audit: `out/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/manual/20260325T065646Z-baseline-audit.md`
- Docs-review manifest: `.runs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22/cli/2026-03-25T07-21-52-956Z-12d6b412/manifest.json`
