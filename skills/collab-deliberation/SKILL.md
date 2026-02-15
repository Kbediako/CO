---
name: collab-deliberation
description: Structure multi-agent brainstorming and deliberation (options, tradeoffs, decision framing) without drifting into implementation.
---

# Collab Deliberation

Use this skill when the user asks for brainstorming, tradeoffs, option comparison, or decision support before implementation. This skill is for ideas and decisions, not coding.

## Deliberation Default v1 (required)
- Keep MCP as the lead control plane. Use collab/delegated subagents to generate and challenge options.
- Run full deliberation when any hard-stop trigger is true:
  - Irreversible/destructive change with unclear rollback.
  - Auth/secrets/PII boundary touched.
  - Direct production customer/financial/legal impact.
  - Conflicting intent on high-impact work.
- Otherwise compute a risk score (`0..2` each): reversibility, external impact, security/privacy boundary, blast radius, requirement clarity, verification strength, time pressure.
- Run full deliberation when score `>=7` or two or more criteria score `2`.
- Use these time budgets for auto-deliberation:

| Class | Horizon | Soft cap | Hard cap |
| --- | --- | --- | --- |
| `T0` | `<=15m` | `5s` | `12s` |
| `T1` | `15m..2h` | `20s` | `45s` |
| `T2` | `2h..8h` | `60s` | `120s` |
| `T3` | `>8h` | `120s` | `300s` |

- On soft cap: stop branching and execute the best current plan.
- On hard cap: disable auto-deliberation for that stage and continue execution.

## Auto-trigger cadence (required)
- Run deliberation at task bootstrap for non-trivial work.
- Re-run deliberation after each meaningful chunk (default: behavior change or about 2+ files touched).
- Re-run deliberation when external feedback lands (PR review, bot findings, CI failures).
- Re-run deliberation when ambiguity/risk increases mid-flight (new constraints, conflicting evidence, high-signal `P1` or any `P0` finding).
- Re-run deliberation at least every 45 minutes during active implementation.
- If orchestration uses symbolic RLM, keep runtime auto-deliberation enabled:
  - `RLM_SYMBOLIC_DELIBERATION=1` (default)
  - `RLM_SYMBOLIC_DELIBERATION_INTERVAL` (default `2`)
  - `RLM_SYMBOLIC_DELIBERATION_MAX_RUNS` (default `12`)
  - `RLM_SYMBOLIC_DELIBERATION_MAX_SUMMARY_BYTES` (default `2048`)
  - `RLM_SYMBOLIC_DELIBERATION_INCLUDE_IN_PLANNER=1` (default)

## Workflow (required)
1) Frame the decision.
- Write a one-sentence decision statement.
- Capture goals, constraints, non-goals, and success criteria.
- List assumptions and label each `confirmed` or `unconfirmed`.

2) Close critical context gaps.
- Ask up to 3 targeted questions only if answers could change the recommendation.
- If delegation is available, prefer a subagent for context gathering before asking the user.
 - If collab spawning fails (for example `agent thread limit reached`), proceed solo and explicitly note the limitation; do not block on spawning.

3) Generate distinct options.
- Produce 3-5 materially different options.
- For each option include approach, prerequisites, blast radius, and time/risk profile.

4) Evaluate and stress test.
- Use a tailored rubric (3-5 dimensions relevant to the decision).
- For each option include one likely failure mode and one mitigation.

5) Recommend or defer explicitly.
- Recommend one option when confidence is sufficient.
- If uncertainty is high, defer with explicit decision gates.

6) Close with decision-driving questions.
- List 1-3 prioritized open questions that could change the recommendation.
- End with one concrete next step that improves decision quality without implementation.

## Output contract
- `Decision`: one sentence.
- `Context`: goals, constraints, non-goals, assumptions.
- `Options`: 3-5 concise options.
- `Tradeoffs`: rubric and comparative rationale.
- `Recommendation`: chosen option or explicit defer with decision gates.
- `Open questions`: prioritized items only.
- `Next step`: single highest-leverage action.
- `Confidence`: `high` | `medium` | `low`.

## Guardrails
- Separate facts from assumptions.
- Do not implement or modify code unless explicitly asked.
- Do not present uncertainty as certainty.
- Keep outputs concise and action-oriented.
- If collab subagents are used, close lifecycle loops per id (`spawn_agent` -> `wait` -> `close_agent`) before finishing.
- If you cannot close collab agents (missing ids) and spawn keeps failing, restart the session and re-run deliberation; keep work moving by doing solo deliberation meanwhile.
