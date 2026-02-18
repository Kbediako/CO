# Collab vs MCP (Decision Guide)

## Default stance (agent-first)
- **MCP is the default control plane** for approvals, tool routing, delegation, and audit trails.
- **Collab is additive** for intra-run multi-agent collaboration (brainstorming, role splits, parallel subcalls).
- If unsure, choose **MCP**. Collab is opt-in (`codex-orchestrator rlm --multi-agent auto "<goal>"` or `RLM_SYMBOLIC_MULTI_AGENT=1`; legacy aliases: `--collab auto`, `RLM_SYMBOLIC_COLLAB=1`) and requires Codex `features.multi_agent=true` (`collab` is a legacy alias).
- **Top-level Codex (lead/representative) must run via MCP.** Collab agents are subordinate assistants and do not represent the run or make final decisions.
- For collab `spawn_agent`, always set explicit `agent_type` (omission defaults to `default`) and tag spawned prompts with `[agent_type:<role>]`.

## Decision matrix

| Decision factor | Choose **Collab** when… | Choose **MCP** when… |
| --- | --- | --- |
| Interaction style | You need iterative back-and-forth with humans. | You need deterministic, repeatable tool calls. |
| Latency tolerance | Longer, conversational cycles are acceptable. | Low-latency, batchable execution is required. |
| Scope & orchestration | Work is ambiguous or exploratory. | Work is well-scoped with clear inputs/outputs. |
| Traceability | Narrative context in docs/threads is the priority. | Machine-readable artifacts and telemetry matter most. |
| Security & access | Sensitive context needs human review before action. | Permissions are scoped and safe to automate. |
| Tooling integration | Manual steps are acceptable. | CI/CD, scripts, or agent pipelines must call it directly. |
| Auditability & approvals | Human-led collaboration is the goal. | You need approval + sandbox enforcement and audit trails. |
| Long-running/pause | Short-lived collab loops are fine. | You need pause/resume, status, and manifest evidence. |
| Parallel subcalls (single run) | You want parallel intra-run agent work. | You need tool-guarded, bounded delegation runs. |

## Notes
- Do not use collab as a replacement for MCP when you need approvals, sandbox enforcement, or manifest-grade auditability.
- Collab can be enabled per-run and should remain off by default unless explicitly required.
- For Playwright-heavy flows, run browser steps in a dedicated subagent stream, keep Playwright MCP off outside that stream, and return artifact paths plus a terse summary instead of raw dumps.
- Current Codex CLI behavior is id-centric for collab UI/events: `agent_type` may not be visibly surfaced in the TUI and may be absent from emitted `collab_tool_call` payloads. Keep explicit prompt role tags (`[agent_type:<role>]`) and watch upstream CLI updates for direct `agent_type` exposure.

## Legacy-Collab Removal Playbook
- Trigger: upstream Codex removes or hard-fails `collab` legacy aliases.
- Immediate CO behavior:
  - Continue accepting `--collab` and `RLM_SYMBOLIC_COLLAB` as local compatibility aliases mapped to canonical `--multi-agent` and `RLM_SYMBOLIC_MULTI_AGENT`.
  - Keep non-blocking warnings on legacy alias usage.
- Hard-cutover gate (before removing local aliases):
  - Shipped/global skills and AGENTS templates are canonical-first (`multi_agent`).
  - README/doctor/help examples are canonical-first.
  - Manual smoke checks pass for both canonical toggles and legacy alias compatibility.
- Removal policy:
  - Remove local `--collab` / `RLM_SYMBOLIC_COLLAB` aliases only in a dedicated follow-up task with release-note migration callouts.
  - Keep `manifest.collab_tool_calls` stable until a schema-versioned manifest migration is approved.

## Cloud Mode (When Relevant)
- Prefer cloud mode for long-running, highly parallel, or locally constrained work.
- Run a preflight before cloud launch:
  - The branch/ref exists on the remote the cloud runner will fetch.
  - Setup commands are non-interactive.
  - Required cloud secrets/variables are available.
- If cloud preflight fails (for example, repo has no cloud env setup yet), run in local `mcp` mode and record the fallback reason in checklist/manifests.

## Deliberation Default v1
- Deliberation is auto-triggered for high-impact or high-ambiguity work.
- Keep MCP as the lead plane; collab/delegated subagents are used to generate/challenge options.

### Full deliberation triggers
- Any hard-stop trigger:
  - Irreversible/destructive change with unclear rollback.
  - Auth/secrets/PII boundary touched.
  - Direct production customer/financial/legal impact.
  - Conflicting intent on high-impact work.
- Or risk score threshold:
  - Score `>=7` across 7 criteria (`0..2` each), or
  - At least two criteria score `2`.

Criteria: reversibility, external impact, security/privacy boundary, blast radius, requirement clarity, verification strength, time pressure.

### Deliberation budgets

| Class | Horizon | Soft cap | Hard cap |
| --- | --- | --- | --- |
| `T0` | `<=15m` | `5s` | `12s` |
| `T1` | `15m..2h` | `20s` | `45s` |
| `T2` | `2h..8h` | `60s` | `120s` |
| `T3` | `>8h` | `120s` | `300s` |

On soft cap, stop branching and execute the best current plan. On hard cap, disable auto-deliberation for that stage and continue execution.

### Symbolic RLM auto-deliberation knobs
- Symbolic runs auto-trigger deliberation by default to keep planning context synchronized.
- Runtime knobs:
  - `RLM_SYMBOLIC_DELIBERATION=1` (default; set `0` to disable)
  - `RLM_SYMBOLIC_DELIBERATION_INTERVAL=2` (run cadence in iterations)
  - `RLM_SYMBOLIC_DELIBERATION_MAX_RUNS=12` (per-run cap)
  - `RLM_SYMBOLIC_DELIBERATION_MAX_SUMMARY_BYTES=2048` (bounded planner context injection)
  - `RLM_SYMBOLIC_DELIBERATION_INCLUDE_IN_PLANNER=1` (inject latest brief into planner prompt)
  - `RLM_SYMBOLIC_DELIBERATION_LOG=0` (default; set `1` to persist deliberation prompt/output/meta artifacts)
- When `RLM_SYMBOLIC_MULTI_AGENT=1` (legacy alias: `RLM_SYMBOLIC_COLLAB=1`), deliberation runs through collab lifecycle (`spawn_agent` → `wait` → `close_agent`) with read-only sandboxing.
- Symbolic collab lifecycle validation enforces prompt-role evidence by default and validates `agent_type` when present. Override only when intentionally needed: `RLM_SYMBOLIC_MULTI_AGENT_ROLE_POLICY=warn|off` (legacy alias: `RLM_COLLAB_ROLE_POLICY`) or `RLM_SYMBOLIC_MULTI_AGENT_ALLOW_DEFAULT_ROLE=1` (legacy alias: `RLM_COLLAB_ALLOW_DEFAULT_ROLE`).

### Review signal policy
- `P0` critical findings are hard-stop.
- `P1` high findings are hard-stop only when high-signal (clear evidence or corroboration).
- `P2/P3` findings are tracked follow-ups, not hard-stop.
