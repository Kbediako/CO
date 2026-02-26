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
1. Built-ins-first baseline: top-level `gpt-5.3-codex` and `model_reasoning_effort >= high`; keep custom roles additive/minimal (`worker_complex`, optional `explorer_fast`). Evidence: sections 1, 4.2, 4.3, 4.7.
2. Additive config updates only: mutate targeted baseline keys/role wiring while preserving unrelated config keys; preserve existing role files unless `--force`. Evidence: section 4.7.
3. Keep scenario/mock/simulation ownership in `skills/collab-evals` for now (additive config merge, built-ins-first RLM behavior, docs relevance drift checks). Evidence: section 5.
4. Keep RLM default-capability overlays and contingency-only fallback posture (`12/4/4` baseline; `8/2/2` and `6/1/1` by exception). Evidence: sections 3, 4.6, 4.8.

### Defer (track as follow-up)
1. New dedicated simulation skill: split only if `collab-evals` becomes too broad.
2. Deterministic docs relevance hard gate: keep agent-first delegated relevance checks until false-positive rate is measured.

## 8) Follow-up implementation updates landed (2026-02-26)

1. Added `codex-orchestrator codex defaults` (dry-run / `--yes` apply / `--force` role overwrite) to apply baseline model/reasoning/agent keys additively and manage role files under `~/.codex/agents/`.
2. Fixed `npm run review` UX failure path: `--help` now exits cleanly and missing `NOTES` auto-falls back with warning.
3. Expanded `skills/collab-evals` scenarios for additive config, built-ins-first RLM behavior, and docs relevance checks.
4. Kept RLM runtime posture as built-ins-first overlays; no major runtime rewrite in this cycle.

## 9) Follow-up implementation updates landed (2026-02-26b)

### 9.1 Shipped changes
1. Added doctor codex-defaults drift advisory (model/reasoning/agent minimums) with additive remediation guidance via `codex-orchestrator codex defaults --yes`.
2. Shipped non-blocking `docs-relevance-advisory` pipeline lane (`docs:freshness -- --warn` + advisory `npm run review`, both `allowFailure`).
3. Tightened built-ins-first policy language in shipped docs/templates and kept RLM posture as built-ins-first overlays.
4. Added explicit awaiter long-wait vs stuck triage guidance across AGENTS/README surfaces.

### 9.2 Validation evidence (repo)
- Required lane rerun passed end-to-end:
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/01-delegation-guard.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/02-spec-guard.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/03-build.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/04-lint.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/05-test.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/06-docs-check.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/07-docs-freshness.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/08-diff-budget.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/09-review.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/followup-20260226b/10-pack-smoke.log`

### 9.3 Throwaway mock/dummy/simulated tests (downstream package path)
- Tarball install + downstream bootstrap:
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-01-setup.log`
- Additive defaults merge simulation (preserve unrelated keys + preserve existing role file without `--force`):
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-02-defaults-additive.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-02-defaults-additive-assert.log`
- Doctor advisory before/after remediation:
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-03-doctor-before.json`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-03-doctor-before-assert.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-03-defaults-remediate.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-03-doctor-after.json`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-03-doctor-after-assert.log`
- `init codex` baseline payload + docs-relevance advisory lane simulation:
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-04-init-codex.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-04-init-assert.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-04-docs-relevance.json`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-04-docs-relevance-assert.log`
  - `out/0980-codex-cli-upgrade-audit-adoption/manual/throwaway-sim-20260226b-04-docs-relevance.stderr.log`
