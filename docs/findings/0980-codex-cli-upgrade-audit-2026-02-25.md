# Codex CLI Upgrade Audit - 0980 (2026-02-25, addendum 2026-02-26)

## 1) What changed in Codex CLI and why it matters for CO

### Release facts (verified)
- Installed local CLI: `codex-cli 0.105.0` (`which codex` -> `/opt/homebrew/bin/codex`).
- Latest stable upstream release: `rust-v0.105.0` published `2026-02-25T17:21:45Z`.
- Latest published prerelease at audit time: `rust-v0.106.0-alpha.3` published `2026-02-25T19:47:33Z`.
- Command evidence:
  - `codex --version`
  - `gh release view rust-v0.105.0 --repo openai/codex --json tagName,isPrerelease,publishedAt,url`
  - `gh release view rust-v0.106.0-alpha.3 --repo openai/codex --json tagName,isPrerelease,publishedAt,url`

### Relevant capability/behavior deltas
- Built-in agent inventory now includes `awaiter` alongside `default`, `explorer`, `worker`.
  - CO impact: docs/skills must stop assuming only three built-ins.
- Built-in `explorer` no longer carries a pinned model profile (`explorer.toml` is currently empty in 0.105.0).
  - CO impact: top-level model/reasoning defaults propagate more naturally unless a role `config_file` overrides them.
- Built-in `awaiter` ships explicit wait-loop behavior with `model_reasoning_effort = "low"`.
  - CO impact: “stuck” perception is usually a long-running wait loop, not deadlock.
- Multi-turn collab lifecycle is first-class: `spawn_agent`, `send_input`, `wait`, `resume_agent`, `close_agent`.
  - CO impact: parent-child reviewer/worker loops can be iterative, not one-shot.
- Spawned agents inherit parent model/reasoning/session config first, then role overrides apply.
  - CO impact: setting top-level `model = "gpt-5.3-codex"` and high reasoning is the highest-leverage default knob.
- Runtime defaults remain conservative upstream (`max_threads=6`, `max_spawn_depth=2`, `max_depth=1`).
  - CO impact: CO must keep explicit operating defaults; cannot rely on upstream defaults for throughput.

## 2) Local fork vs upstream delta summary
- Local fork repo: `/Users/kbediako/Code/codex`.
- Remotes: `origin=https://github.com/Kbediako/codex.git`, `upstream=https://github.com/openai/codex.git`.
- Divergence at addendum check time (`2026-02-26`):
  - `main...upstream/main` => `0 ahead / 44 behind`
  - `origin/main...upstream/main` => `0 ahead / 44 behind`
- Command evidence:
  - `git -C /Users/kbediako/Code/codex fetch --all --prune`
  - `git -C /Users/kbediako/Code/codex rev-list --left-right --count main...upstream/main`
  - `git -C /Users/kbediako/Code/codex rev-list --left-right --count origin/main...upstream/main`

## 3) Decision log: depth/thread defaults

### Final recommendation (adopted in CO docs/templates)
- CO baseline profile:
  - `[agents] max_threads = 12`
  - `[agents] max_depth = 4`
  - `[agents] max_spawn_depth = 4`
- Fallback posture (contingency-only):
  - constrained/high-risk lanes: `8/2/2`
  - severe contention break-glass: `6/1/1`

### Rationale
- User requirement for this follow-up explicitly set max depth to `4`.
- CO workloads frequently need recursive planning + multi-stream execution in the same run.
- Upstream now supports richer multi-turn subagent loops; deeper but bounded recursion is more operationally useful than in earlier snapshots.
- Guardrails were tightened so depth increase is not paired with routine fallback reliance.

### Risks and tradeoffs
- `12/4/4` increases fan-out blast radius, log volume, and debugging complexity versus `12/2/2`.
- Tool contention risk is higher on constrained hosts.
- Mitigation:
  - enforce explicit stream ownership,
  - require lifecycle close-sweep (`spawn -> wait -> close`),
  - downgrade to `8/2/2` or `6/1/1` only when evidence shows instability.

### Alternatives considered and rejected
- `12/2` as default: safer operationally and recommended by conservative stream analysis, but rejected for this cycle due explicit user direction to adopt depth `4`.
- `8/1` as universal default: rejected due throughput loss for standard CO multi-agent tasks.
- `>=5` depth default: rejected due excessive complexity/trace burden for daily workloads.

## 4) Deliberations requested in follow-up

### 4.1 What caused "awaiter" to look stuck?
- Root cause: expected behavior, not a deadlock.
- Evidence:
  - Built-in awaiter instructions require polling until terminal state and prefer long timeouts.
  - `wait` timeout clamps are `min 10s / default 30s / max 1h`; sparse updates can look idle.
  - `close_agent` returns a snapshot and can be misread as live status.
- Operational change: CO guidance now treats awaiter as a long-poll role and recommends patience-first monitoring windows.

### 4.2 What new/shipped agents exist?
- Built-ins in current Codex source: `default`, `explorer`, `worker`, `awaiter`.
- CO user-defined roles retained/added for specialization:
  - `explorer_fast` (`gpt-5.3-codex-spark`, text-only)
  - `worker_complex` (`gpt-5.3-codex`, `xhigh`)
  - `researcher` (user-defined when needed)

### 4.3 Should CO rely more on default built-ins now?
- Yes, with a built-ins-first posture.
- Decision:
  - use built-ins by default,
  - add only a minimal custom layer for clear win roles (`explorer_fast`, `worker_complex`),
  - avoid role sprawl.
- Reason: less maintenance drift and better upstream compatibility.

### 4.4 Should CO create more custom agents generally?
- Not broadly.
- Create custom roles only when one of these is true:
  - repeated workload class with measurable quality/latency gain,
  - stable ownership boundaries,
  - clear validation and rollback path.

### 4.5 Spark-role strategy (fast but text-only)
- Keep spark usage targeted:
  - best for rapid search/synthesis/scoping streams,
  - avoid for image-required or high-stakes final decision streams.
- Current CO action: preserve optional `explorer_fast` rather than expanding many spark roles.

### 4.6 Can spawned agents communicate multi-turn?
- Yes.
- Supported lifecycle: `spawn_agent` -> repeated `send_input` -> `wait`/`resume_agent` -> `close_agent`.
- Additional parent-child escalation path exists via delegation queue:
  - `delegate.question.enqueue` / `delegate.question.poll`.
- New capability unlocked: iterative reviewer-worker loops with explicit stop criteria.

### 4.7 High-reasoning defaults for subagents (confirmed)
- Confirmed behavior:
  - spawn config inherits parent `model` and `model_reasoning_effort` first,
  - role `config_file` can override afterward.
- CO action:
  - top-level baseline remains `gpt-5.3-codex` + `xhigh`,
  - `init codex` now ships downstream .codex/config.toml + role files (from `templates/codex/.codex/*`),
  - template includes `awaiter-high.toml` to keep awaiter semantics while meeting high-reasoning baseline.

### 4.8 Why fallback profiles still matter (without over-reliance)
- Fallbacks are still required as safety valves for constrained/high-risk environments.
- Policy tightened in this follow-up:
  - baseline: `12/4/4`
  - contingency only: `8/2/2`
  - break-glass only: `6/1/1`
- This addresses “fallback overuse” by making fallback explicit exception handling, not routine guidance.

## 5) Additional CO upgrades enabled by current CLI behavior

### High impact / low-medium effort
1. Ship downstream default Codex config via `init codex` (now implemented).
2. Normalize docs/skills to built-ins-first inventory including `awaiter` (implemented).
3. Standardize multi-turn lifecycle guidance in skills (`spawn/send/wait/resume/close`) (implemented in primary delegation docs).

### Medium impact / medium effort
1. Add `doctor` surface checks for role drift (for example detect missing `templates/codex/.codex/config.toml` payloads or stale role files).
2. Add explicit awaiter monitor checkpoint hints in review/PR-watch wrappers.

### Medium impact / higher effort
1. Automate upstream role-config drift detection (compare built-in role files vs CO template overrides).

## 6) Evidence commands used in this addendum
- `codex --version`
- `gh release view rust-v0.105.0 --repo openai/codex --json tagName,isPrerelease,publishedAt,url`
- `gh release view rust-v0.106.0-alpha.3 --repo openai/codex --json tagName,isPrerelease,publishedAt,url`
- `git -C /Users/kbediako/Code/codex fetch --all --prune`
- `git -C /Users/kbediako/Code/codex rev-list --left-right --count main...upstream/main`
- `git -C /Users/kbediako/Code/codex rev-list --left-right --count origin/main...upstream/main`
- `rg -n "DEFAULT_AGENT_MAX_THREADS|DEFAULT_AGENT_MAX_SPAWN_DEPTH|DEFAULT_AGENT_MAX_DEPTH" /Users/kbediako/Code/codex/codex-rs/core/src/config/mod.rs`
- `nl -ba /Users/kbediako/Code/codex/codex-rs/core/src/agent/role.rs | sed -n '146,230p'`
- `sed -n '1,12p' /Users/kbediako/Code/codex/codex-rs/core/src/agent/builtins/awaiter.toml`
- `sed -n '1,12p' /Users/kbediako/Code/codex/codex-rs/core/src/agent/builtins/explorer.toml`
- `nl -ba /Users/kbediako/Code/codex/codex-rs/core/src/tools/spec.rs | sed -n '740,980p'`
- `nl -ba /Users/kbediako/Code/codex/codex-rs/core/src/tools/handlers/multi_agents.rs | sed -n '1,120p'`
- `nl -ba /Users/kbediako/Code/codex/codex-rs/core/src/tools/handlers/multi_agents.rs | sed -n '898,960p'`

## 7) Follow-up recommendation matrix (2026-02-26)

### Adopt now
1. Baseline on raw built-ins plus top-level `gpt-5.3-codex` and `model_reasoning_effort >= high`:
   - Keep custom roles additive and minimal (`worker_complex`, optional `explorer_fast`), not replacements for built-ins.
   - Evidence: sections 1, 4.2, 4.3, 4.7.
2. Enforce additive user config updates only (no destructive overwrite):
   - Apply only targeted baseline keys/role wiring while preserving unrelated user config keys; preserve existing role files unless explicitly forced.
   - Evidence: section 4.7 and current `init codex` downstream config posture.
3. Keep scenario/mock/simulation testing in `skills/collab-evals` now:
   - Add explicit scenarios for additive config merge validation, RLM default-capability behavior, and docs relevance drift checks.
   - Evidence: section 5 plus this follow-up scope.
4. Rework RLM guidance to default Codex capabilities first, then CO overlays:
   - Keep `rlm --multi-agent auto` as the default path and treat custom recursion policy as an overlay, not a forked control model.
   - Evidence: sections 1 and 4.6.
5. Increase agent-first/full-autonomy emphasis:
   - Require at least one delegated research/review stream in non-trivial lanes and document summary-only parent handoff.
   - Evidence: section 4.6 and established delegation policy.
6. Keep fallback profiles as explicit contingency:
   - Baseline remains `12/4/4`; `8/2/2` and `6/1/1` require evidence-backed exception rationale.
   - Evidence: sections 3 and 4.8.

### Defer (track as follow-up)
1. New dedicated simulation skill:
   - Defer creating a new skill unless `collab-evals` simulation guidance becomes broad enough to dilute that skill's core purpose across multiple tasks.
2. Docs relevance hard test gate:
   - Defer a strict deterministic pass/fail test until false-positive rates and ownership boundaries are measured; run agent-first docs relevance checks first.

## 8) Follow-up implementation updates landed (2026-02-26)

1. Added additive global Codex defaults command:
   - `codex-orchestrator codex defaults` (dry-run by default, `--yes` to apply, `--force` to overwrite existing role files).
   - Applies baseline keys (`model`, `model_reasoning_effort`, `agents.max_threads`, `agents.max_depth`, `agents.max_spawn_depth`) while preserving unrelated config keys.
   - Writes/maintains role files under `~/.codex/agents/` for `explorer_fast`, `worker_complex`, and high-reasoning `awaiter`.
2. Fixed standalone review wrapper UX failure path:
   - `npm run review -- --help` now exits with usage output instead of running review flow.
   - Missing `NOTES` no longer hard-fails; wrapper generates fallback notes and logs a warning.
3. Expanded simulation guidance in `skills/collab-evals`:
   - Added additive-config, built-ins-first RLM behavior, and docs-relevance simulation scenarios.
4. Kept RLM runtime posture as overlay-first (no major runtime rewrite this cycle):
   - Decision remains built-ins-first with CO overlays; runtime rewrite deferred pending stronger evidence.
