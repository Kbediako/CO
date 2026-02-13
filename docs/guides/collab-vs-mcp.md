# Collab vs MCP (Decision Guide)

## Default stance (agent-first)
- **MCP is the default control plane** for approvals, tool routing, delegation, and audit trails.
- **Collab is additive** for intra-run multi-agent collaboration (brainstorming, role splits, parallel subcalls).
- If unsure, choose **MCP**. Collab is opt-in (`--enable collab` / `RLM_SYMBOLIC_COLLAB=1`).
- **Top-level Codex (lead/representative) must run via MCP.** Collab agents are subordinate assistants and do not represent the run or make final decisions.

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

### Review signal policy
- `P0` critical findings are hard-stop.
- `P1` high findings are hard-stop only when high-signal (clear evidence or corroboration).
- `P2/P3` findings are tracked follow-ups, not hard-stop.
