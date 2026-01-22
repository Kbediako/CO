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
