# PRD - CO: Re-audit Codex CLI 0.124.0 posture and GPT-5.5 hook/config alignment

## Summary
- Problem Statement: Codex CLI `0.124.0` was released while CO orchestration was already in progress. The current CO repo posture still targets `0.123.0` with `gpt-5.4` defaults, while live local evidence now shows `codex-cli 0.124.0` is installed and can run `gpt-5.5` with `xhigh` reasoning under ChatGPT auth. CO must not blindly promote the new CLI/model pair until runtime, review, delegation, provider, cloud, hook, and downstream-smoke surfaces are checked and the resulting posture is made explicit.
- Desired Outcome: align CO to the current supported Codex CLI and model posture only after artifact-backed validation, fix local hook/config drift found by `0.124.0`, preserve `explorer_fast` as the file/codebase search-only spark exception, update repo defaults/docs/workflow pins if validation passes, and leave Linear issues in truthful terminal or active states.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): continue the interrupted orchestration, use subagents as supporting evidence lanes, account for the new `0.124.0` Codex CLI update, leverage `gpt-5.5` with `xhigh` where validated, keep the Orchestrator auto-continuation hook active, create/validate Linear issues for observed problems, and shepherd the active CO Linear work to truthful completion instead of stopping early.
- Success criteria / acceptance:
  - local CLI identity confirms `codex-cli 0.124.0`
  - npm and official release/tag evidence confirms `@openai/codex@0.124.0`
  - `gpt-5.5` plus `model_reasoning_effort = "xhigh"` is validated on the same ChatGPT-auth surface CO uses
  - command, review, runtime-mode, delegation/subagent, provider-worker, app-server, cloud-required, cloud-fallback, marketplace, and pack-smoke surfaces are checked or explicitly blocked with evidence
  - hook/config drift from `remote_connections`, `skills`, `voice_transcription`, stale `legacy_notify`, and `after_agent hook failed` is fixed or tracked
  - CO docs/defaults/tests/workflows are updated only after evidence supports the posture
  - active Linear issue state remains truthful and the CO In Progress count stays at or below four
- Constraints / non-goals: no blind promotion, no edits in the dirty shared checkout, no weakening delegation guard or review gates, no expanding the lane into the release-publish blocker, no moving CO-337/CO-338/CO-340/CO-341 to Done without terminal evidence, and no treating plugin-manifest warnings as fixed unless validated.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `0.124.0`
  - `leverage everything in 124`
  - `gpt 5.5 xhigh`
  - `fix/enable hook for yourself as the Orchestrator`
  - `orchestrating the monitoring of the linear work`
  - `raising and validating linear issue for any problems that are observed`
- Protected terms / exact artifact and surface names:
  - `codex-cli 0.124.0`
  - `rust-v0.124.0`
  - `@openai/codex@0.124.0`
  - `gpt-5.5`
  - `model_reasoning_effort = "xhigh"`
  - `review_model`
  - `explorer_fast`
  - `gpt-5.3-codex-spark`
  - `codex_hooks`
  - `hooks.json`
  - `co_orchestration_autocontinue.json`
  - `continue_co_orchestration.py`
  - `legacy_notify`
  - `codex exec`
  - `codex review`
  - `codex app-server`
  - `codex cloud`
  - `npm run ci:cloud-canary`
  - `npm run pack:smoke`
  - CO-337, CO-338, CO-340, CO-341
- Nearby wrong interpretations to reject:
  - treating the positive local `gpt-5.5` smoke as sufficient to promote every CO surface
  - widening CO-337 or CO-340 instead of using CO-341 as the canonical `0.124.0` posture lane
  - using CO-341 to solve the separate release publish blocker tracked by CO-338
  - suppressing 0.124 warnings without fixing the stale config source
  - disabling the Orchestrator continuation hook to finish early
  - creating duplicate Linear issues for observations already covered by CO-341

## Parity / Alignment Matrix
- Current truth:
  - current main targets Codex CLI `0.123.0` and model posture `gpt-5.4`
  - release-facing smoke and cloud canary workflow pins are at `@openai/codex@0.123.0`
  - local Codex has moved to `codex-cli 0.124.0`
  - local `gpt-5.5` `codex exec` smoke succeeds under ChatGPT auth
  - local `0.124.0` startup warned on stale feature keys and stale notify plugin path before the operator config fix
- Reference truth:
  - GitHub release `rust-v0.124.0` is the primary release-note source
  - npm publishes `@openai/codex@0.124.0` as the latest package
  - OpenAI Codex model/config docs list `gpt-5.5` and `xhigh`, while some docs may lag on FAQ wording
  - CO version policy requires local command, runtime-mode, cloud-required, cloud-fallback, delegated/review, and downstream smoke evidence before promotion
- Target truth / intended delta:
  - CO policy, AGENTS mirrors, README mirrors, Codex default setup, template config, workflow pins, and focused tests reflect `0.124.0` and validated `gpt-5.5` posture
  - hook/config drift is either fixed locally or represented in repo-owned guidance/tests when applicable
  - residual warnings or blocked validation lanes are tracked in Linear rather than hidden
- Explicitly out-of-scope differences:
  - publishing the `v0.2.0` release from CO-338
  - unrelated stale docs-freshness debt
  - a broad plugin-manifest cleanup outside CO unless the warning affects CO-packaged assets
  - changing `explorer_fast` away from its existing spark search-only role

## Not Done If
- `0.124.0` is documented as promoted without local command, runtime, review/delegation, cloud, and pack-smoke evidence or a named blocker.
- `gpt-5.5` becomes the default without proving it works on top-level, delegated, and review/provider surfaces used by CO.
- The Orchestrator auto-continuation hook is disabled or left with stale notify/config warnings.
- CO-337, CO-338, CO-340, or CO-341 are moved to Done while their terminal criteria remain incomplete.
- A new warning or failure is observed and neither folded into CO-341 nor raised as a validated follow-up issue.

## Goals
- Re-audit Codex CLI `0.124.0` against CO command, runtime, review, delegation, provider, cloud, and downstream-smoke contracts.
- Validate and document `gpt-5.5` plus `xhigh` as the CO model posture when evidence permits.
- Fix or document hook/config drift exposed by `0.124.0`.
- Keep Linear issue state truthful while monitoring active release/posture lanes to terminal evidence.

## Non-Goals
- Do not merge or publish the release in this lane.
- Do not bypass cloud gates because local `codex exec` succeeds.
- Do not weaken delegation or review guardrails.
- Do not clean unrelated local plugin temp directories unless they are proven to affect CO outputs.

## Stakeholders
- Product: CO operators and downstream users relying on stable Codex defaults.
- Engineering: CO runtime, provider-worker, review-wrapper, cloud-canary, and release-smoke maintainers.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - `0.124.0` promotion has artifact-backed GO or explicit HOLD
  - `gpt-5.5` posture is validated on intended surfaces or held with a concrete blocker
  - config/hook smoke no longer emits the targeted stale-feature or `legacy_notify` failures
  - pack-smoke and cloud gates are truthful
- Guardrails / Error Budgets:
  - zero blind promotion
  - zero duplicate Linear issues for the same observed problem
  - zero active CO issue count above the configured cap of four

## User Experience
- Personas:
  - top-level CO Orchestrator continuing an interrupted run
  - provider worker inheriting repo defaults
  - downstream operator installing and running CO from npm
- User Journeys:
  - operator checks CO docs and sees the current Codex CLI/model target plus the evidence that justified it
  - provider/review lanes inherit the validated model/default posture without hidden local config drift
  - release smoke uses the same Codex CLI contract documented in version policy

## Technical Considerations
- Architectural Notes: promotion touches policy mirrors, workflow pins, default config generation, review/provider behavior, and tests. The smallest acceptable implementation is a posture update backed by command artifacts and focused guard coverage, not a broad runtime rewrite.
- Dependencies / Integrations: Codex CLI, ChatGPT auth, GitHub release metadata, npm package metadata, Linear, cloud canary environment, `codex-orchestrator review`, `scripts/runtime-mode-canary.mjs`, `scripts/cloud-canary-ci.mjs`, and pack-smoke.

## Open Questions
- Cloud-required and cloud-fallback lanes remain the last promotion gate until the CO-341 branch is pushed and canary manifests are captured.
- Review can use `gpt-5.5` for CO-local posture: `codex-orchestrator review` ran on Codex `0.124.0`, appserver runtime, `model: gpt-5.5`, and `xhigh` with manifest-backed evidence.
- Residual plugin-manifest warnings are local-only for this lane: command and pack-smoke evidence point at temporary plugin cache state, not CO-packaged assets.

## Approvals
- Product: issue accepted via CO-341.
- Engineering: parent Orchestrator approved docs-first setup after subagent validation confirmed CO-341 is the canonical lane.
- Design: not applicable.
