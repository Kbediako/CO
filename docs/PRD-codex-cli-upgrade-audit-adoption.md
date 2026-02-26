# PRD - Codex CLI Upgrade Audit + CO Capability Adoption (0980)

## Summary
- Problem Statement: CO currently carries mixed assumptions across docs/skills/config about Codex CLI multi-agent behavior, collab/delegation semantics, and agent thread defaults while upstream Codex CLI has introduced new capabilities and behavior shifts.
- Desired Outcome: establish an evidence-backed latest-capability baseline and ship targeted CO upgrades that improve adoption safety, consistency, and downstream usability without unrelated refactors.
- Follow-up extension (2026-02-26): codify built-ins-first/high-reasoning defaults, additive config update policy, simulation coverage guidance, docs relevance governance, and fallback exception posture.
- Follow-up extension (2026-02-26b): ship doctor defaults-drift advisory, add a non-blocking docs-relevance advisory lane, tighten built-ins-first RLM guidance, and add explicit awaiter long-wait triage guidance with throwaway simulation evidence.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): deeply audit latest Codex CLI changes, compare local fork against upstream, deliberate on depth/thread defaults (including a decision on moving to 12 threads), implement CO updates across code/config/docs/skills, validate, and merge the PR end-to-end.
- Success criteria / acceptance:
  - A concise, sourced "what changed" report exists and clearly explains CO impact.
  - Local fork delta summary includes ahead/behind counts and key commit-level differences.
  - Explicit decision log for depth-by-workload defaults and thread limit decision is documented.
  - CO updates are implemented and consistent across AGENTS/README/docs/skills/templates.
  - Follow-up decisions are explicit for raw built-ins + `>= high` reasoning baseline, additive config updates, scenario/mock/simulation ownership, RLM default-capability posture, docs relevance governance, and fallback rationale.
  - `doctor` surfaces additive Codex-defaults drift advisories for model/reasoning/agent baseline and remediation guidance.
  - A docs-relevance advisory lane exists and is explicitly non-blocking while false-positive rates are unknown.
  - Awaiter operations guidance distinguishes long-running waits from truly stuck behavior.
  - Mock/dummy/simulated tests in a throwaway repo validate the new CLI/docs behavior end-to-end.
  - Required validation chain passes and evidence is captured.
  - PR is opened, feedback handled, checks monitored through quiet window, and merged.
- Constraints / non-goals:
  - Keep changes minimal and high-leverage.
  - Avoid destructive git operations.
  - Do not overfocus only on depth/thread count; cover broader capability surface.

## Goals
- Upgrade CO guidance/config posture to align with current Codex CLI behavior.
- Improve consistency of canonical-vs-legacy collab/multi-agent terminology.
- Document and codify workload-specific depth/thread recommendations with clear tradeoffs.
- Capture a reproducible fork-delta process for future upgrade audits.
- Prefer agent-first autonomy with delegation-backed evidence for non-trivial workstreams.
- Preserve user config via additive updates rather than destructive rewrite patterns.

## Non-Goals
- Re-architecting orchestrator runtime internals.
- Replacing existing delegation/collab architecture.
- Broad refactors unrelated to Codex CLI adoption gaps.

## Stakeholders
- Product: CO maintainers and downstream users relying on packaged docs/skills.
- Engineering: operators running multi-agent, delegation, review, and orchestration flows.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - No stale guidance remains for adopted defaults in touched surfaces.
  - Required validation chain passes on this branch.
  - PR merges cleanly with review/bot feedback resolved.
- Guardrails / Error Budgets:
  - Keep diff scoped to audit/adoption goals.
  - Preserve backward compatibility language where legacy alias support still exists.

## User Experience
- Personas: top-level CO users, downstream npm users, maintainers auditing run evidence.
- User Journeys:
  - User asks for latest Codex CLI adoption guidance and receives current, consistent defaults.
  - User runs upgrade/sync flow and can quickly see fork divergence and capability impact.
  - User can choose depth/thread defaults by workload with explicit risks.

## Technical Considerations
- Architectural Notes: keep implementation mostly in docs/skills/config guidance, plus minimal helper/script updates when they materially improve upgrade operations.
- Dependencies / Integrations: GitHub release metadata, local `codex` fork state, existing CO validation chain.

## Decision Log
- Decision (2026-02-26): set `[agents] max_threads = 12`, `[agents] max_depth = 4`, and `[agents] max_spawn_depth = 4` as CO defaults, with contingency-only fallback profiles `8/2/2` (constrained/high-risk) and `6/1/1` (break-glass severe contention).
- Rationale: CO workloads benefit from deeper bounded recursion and higher parallel throughput, and contingency fallback remains available without becoming the routine operating posture.
- Decision (2026-02-26): baseline guidance remains raw built-ins plus top-level `model = "gpt-5.3-codex"` and `model_reasoning_effort >= high`; custom roles are additive and minimal.
- Rationale: upstream built-ins (`default`, `explorer`, `worker`, `awaiter`) now cover primary control semantics while inherited top-level model/reasoning settings provide the highest-leverage global behavior control.
- Decision (2026-02-26): user config updates should be additive and non-destructive by default.
- Rationale: preserves local user intent while still applying safe CO defaults.
- Decision (2026-02-26): keep scenario/mock/simulation coverage inside `skills/collab-evals` now; defer a new dedicated simulation skill unless scope expands materially.
- Rationale: minimal footprint now, with clear escalation path if responsibilities exceed a single skill's focus.
- Decision (2026-02-26): docs relevance/up-to-date checks should start as an agent-first delegated lane; defer strict deterministic gating until quality signals stabilize.
- Rationale: semantic relevance is hard to gate deterministically without noisy failures.
- Decision (2026-02-26b): add a `doctor` advisory (not hard gate) for codex-defaults drift from CO baseline (`gpt-5.3-codex`, `>= high` reasoning, `12/4/4` agent limits).
- Rationale: gives downstream users a safe detection/remediation path without destructive writes or blocking workflows.
- Decision (2026-02-26b): ship docs-relevance as an advisory lane and keep deterministic docs gates (`docs:check`, `docs:freshness`) unchanged.
- Rationale: preserves current CI reliability while gathering signal quality on semantic relevance.
- Decision (2026-02-26b): keep RLM built-ins-first posture; avoid runtime rework and only add specialized custom roles with measurable value.
- Rationale: upstream built-ins are sufficient for default orchestration; minimizing custom role sprawl reduces maintenance drift.
- Decision (2026-02-26b): codify awaiter “long-wait vs stuck” triage in operator-facing docs.
- Rationale: prevents false stuck diagnoses and keeps patience-first monitoring behavior explicit.

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
