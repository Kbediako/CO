# PRD - Review Modernization + Docs Discoverability + RLM Canary (0966)

## Summary
- Problem Statement: CO’s `npm run review` wrapper still treats `codex review` as if it cannot combine diff scoping flags (`--uncommitted/--base/--commit`) with a custom prompt, and it doesn’t persist review output in a run-local artifact for agents to reference later.
- Desired Outcome: update `npm run review` to prefer real diff scoping when supported, persist the review prompt/output under the active `.runs/<task>/...` directory, and tighten timeout/exit behavior so review runs don’t hang silently. Also make the RLM + cloud guides more discoverable and ensure a small RLM recursion canary exists.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): leverage new Codex CLI review capabilities for lower friction and higher accuracy, while keeping CO agent-first by making key docs discoverable and ensuring important RLM recursion behaviors have a fast regression canary.
- Success criteria / acceptance:
  - `npm run review` passes real diff scoping flags to `codex review` when possible, while retaining compatibility with older Codex CLIs.
  - Review prompt and output are persisted under the active run directory (so agents can follow-up without copy/paste).
  - Review execution has a clear timeout policy and exits deterministically (no silent hangs).
  - RLM recursion + cloud docs are surfaced from CLI help and/or README.
  - A fast test canary exists that covers pointer reads + `final_var` resolution.

## Goals
- Modernize `scripts/run-review.ts` to:
  - Prefer `codex review --uncommitted/--base/--commit` when supported.
  - Persist `review/prompt.txt` and `review/output.log` (or equivalent) under `CODEX_ORCHESTRATOR_RUN_DIR` (or the resolved manifest directory).
  - Keep non-interactive “handoff” behavior for CI, but still write the prompt artifact.
  - Ensure timeouts are enforced with an actionable error.
- Improve docs discoverability for:
  - `docs/guides/rlm-recursion-v2.md`
  - `docs/guides/cloud-mode-preflight.md`
- Ensure a small RLM recursion canary exists in the unit test suite.

## Non-Goals
- Replacing `codex review` or building a separate review engine.
- Forcing review execution inside CI (CI should still emit the handoff prompt by default).
- Turning unit tests into network-dependent RLM runs.

## Stakeholders
- Downstream npm users depending on `npm run review` and the docs-first workflow.
- CO maintainers validating guardrails via CI and manifest evidence.
- Agents using CO for long-horizon work (need persistent review artifacts and discoverable docs).

