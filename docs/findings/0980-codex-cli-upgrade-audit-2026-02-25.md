# Codex CLI Upgrade Audit - 0980 (2026-02-25)

## 1) What changed in Codex CLI and why it matters for CO

### Release facts (verified)
- Installed local CLI: `codex-cli 0.105.0` (`which codex` -> `/opt/homebrew/bin/codex`).
- Latest stable upstream release: `0.105.0` published `2026-02-25T17:21:45Z`.
- Latest published prerelease: `0.106.0-alpha.3` published `2026-02-25T19:47:33Z`.
- Command evidence:
  - `gh release list --repo openai/codex --limit 10`
  - `gh release view rust-v0.105.0 --repo openai/codex --json name,tagName,isPrerelease,publishedAt,url`
  - `gh release view rust-v0.106.0-alpha.3 --repo openai/codex --json name,tagName,isPrerelease,publishedAt,url,body`

### Relevant capability/behavior deltas
- Multi-agent expansion in stable line includes native `spawn_agents_on_csv` fan-out support and improved multi-agent UX signals.
  - CO impact: use native CSV fan-out for high-volume parallel jobs before building custom wrappers.
- Review-mode delegation explicitly disables collab tools and web search.
  - CO impact: review pipelines must assume single-agent reviewer behavior; no review-thread collab assumptions.
- Canonical naming direction remains `multi_agent` (legacy `collab` aliases still present).
  - CO impact: keep canonical-first wording with compatibility notes.
- Approval controls and related behaviors continue evolving (including granular reject controls and approval handling updates).
  - CO impact: keep approval guidance explicit and avoid stale assumptions.
- Config/runtime defaults remain important drift points (`agents.max_threads` default 6 upstream, `allow_login_shell` default true, project-root marker handling updates).
  - CO impact: CO should pin/communicate explicit operational defaults instead of relying on upstream defaults.

## 2) Local fork vs upstream delta summary
- Local fork repo: `/Users/kbediako/Code/codex`.
- Remotes: `origin=https://github.com/Kbediako/codex.git`, `upstream=https://github.com/openai/codex.git`.
- Divergence at audit time:
  - `main...upstream/main` => `0 ahead / 32 behind`.
  - `origin/main...upstream/main` => `0 ahead / 32 behind`.
- Key upstream-only commits include:
  - `c1851be1e` only use preambles for realtime
  - `21f7032db` app-server thread/unsubscribe API
  - `d45ffd583` model visibility updates
  - `01f25a7b9` unify max depth parameter
- Key local-only feature-branch commits include structured output/signal fixes (not on local `main`):
  - `841f217d0`, `1aaa8b945`, `fe165b008`, `caccbfbe9`, `f29988db3`
- Command evidence:
  - `git -C /Users/kbediako/Code/codex fetch --all --prune`
  - `git -C /Users/kbediako/Code/codex rev-list --left-right --count main...upstream/main`
  - `git -C /Users/kbediako/Code/codex log --oneline --no-merges main..upstream/main -n 20`
  - `git -C /Users/kbediako/Code/codex log --oneline --no-merges --branches --not upstream/main -n 20`

## 3) Decision log: depth/thread defaults

### Final recommendation (adopted)
- CO default multi-agent profile:
  - `[agents] max_threads = 12`
  - `[agents] max_depth = 2`
- Workload profiles:
  - Deterministic/high-risk implementation or constrained host: `max_threads = 8`, `max_depth = 1`
  - Standard multi-agent implementation/research: `max_threads = 12`, `max_depth = 2`
  - High fan-out batch work (for example CSV jobs): start `12/2`, prefer `spawn_agents_on_csv`, raise only with explicit evidence.

### Rationale
- Upstream default (`6`) is conservative for broad compatibility.
- CO workloads regularly use parallel analysis/review/planning streams; `12/2` increases throughput while avoiding uncontrolled recursion.
- `max_depth = 2` keeps one recursive layer available without opening deep fan-out by default.

### Risks and tradeoffs
- Higher thread counts can increase local CPU/memory contention and make logs noisier.
- Higher depth can amplify coordination overhead if prompt/ownership discipline is weak.
- Mitigation: keep fallback profile (`8/1`) documented and treat deeper settings as deliberate overrides.

### Alternatives rejected
- Keep `8` as universal default: rejected due to lower throughput for common CO multi-stream workloads.
- Raise threads to `12` but keep depth at `1`: rejected because it blocks useful bounded recursion patterns.
- Aggressive depth (`>=3`) as default: rejected due elevated blast radius and debugging complexity.

## 4) Additional upgrades prioritized (beyond depth/thread)

### High impact / low-medium effort
1. Add routine release-drift check to operator playbooks (`gh release list` + fork divergence commands).
2. Keep canonical `multi_agent` wording everywhere while preserving explicit legacy-alias compatibility notes.
3. Bake review-mode collab limitation into guidance to avoid false assumptions in review flows.

### Medium impact / medium effort
1. Add `doctor`-level surfaced warning when local fork is significantly behind upstream.
2. Add optional capability probes in diagnostics for `spawn_agents_on_csv` and review-mode tool restrictions.

### Medium impact / higher effort
1. Add automated upstream release ingest + CO compatibility report artifact generation.

## 5) Follow-up deliberations (added during execution)

### 5.1 Additional CO upgrades to better leverage new CLI behavior
1. Add a lightweight capability probe command in CO diagnostics (`codex --version`, `codex features list`, `spawn_agents_on_csv` availability) and emit a task-scoped artifact.
2. Add a pre-review docs budget guard (`docs/TASKS.md` line budget) before running `npm run review` to prevent avoidable review-loop churn.
3. Prefer native `spawn_agents_on_csv` for independent row/batch workloads in SOP examples before custom orchestration wrappers.

### 5.2 Max threads = 12 globally in CO docs/skills guidance
- Adopted: CO guidance is now standardized on `max_threads = 12` for active multi-agent lanes across:
  - `README.md`
  - `AGENTS.md`
  - `templates/codex/AGENTS.md`
  - `skills/delegation-usage/SKILL.md`
  - `skills/delegation-usage/DELEGATION_GUIDE.md`
  - supporting guidance in `docs/guides/rlm-recursion-v2.md`

### 5.3 Why `max_depth = 2` is currently the best default
- `max_depth = 1` blocks bounded recursive decomposition patterns that are useful in CO (plan -> subplan -> execute).
- `max_depth = 2` allows one recursive layer while still keeping fan-out and debugging complexity controlled.
- `max_depth >= 3` materially increases blast radius, coordination overhead, and trace complexity without strong evidence of net gain for normal CO workloads.
- Decision: keep `2` as default, and require explicit task-level justification for deeper recursion.

### 5.4 Should CO rely more on default Codex CLI spawning vs custom RLM flow?
- Yes for bounded independent work: prefer native spawning (`spawn_agent`, `spawn_agents_on_csv`) when tasks are clearly partitionable.
- No, as a full replacement for RLM orchestration: default spawning does not replace CO’s planning contracts, guardrail choreography, and manifest-backed “slice/delegate/stitch” conventions.
- Practical rule: default spawning for execution fan-out; RLM for recursive planning/coordination and evidence-heavy orchestration flows.

### 5.5 Can spawned agents run multi-turn interactions?
- Yes. The collab tool lifecycle supports iterative interactions (`spawn_agent` -> repeated `send_input` -> `wait`/`resume_agent` -> `close_agent`) rather than one-shot-only behavior.
- This is suitable for reviewer/worker loops when bounded ownership and stop conditions are explicit.

### 5.6 `npm run review` failure investigation and fix
- The wrapper itself ran; repeated failures came from review findings and one guardrail break, not from an unrecoverable wrapper crash.
- Root cause found during loop: `docs/TASKS.md` exceeded policy budget (`451 > 450`), which caused `npm run docs:check` to fail.
- Fix applied: reduced `docs/TASKS.md` line count back under policy (`449`) and revalidated with `npm run docs:check`.

### 5.7 Why fallback profiles still matter (and whether CO is overusing them)
- Fallback is a safety valve, not the default operating mode.
- Primary default remains `12/2`; fallback `8/1` is for constrained hosts, deterministic high-risk edits, or observed contention.
- Current policy intent is not “rely on fallbacks,” but “avoid hard failure when local conditions cannot sustain default parallelism.”

### 5.8 Stability evidence for `max_threads = 12`
- Scope note: this adoption did not include a dedicated synthetic MCP saturation harness run in this task.
- Evidence used for this decision:
  - Full CO validation chain and packaging smoke lane passed on this branch after the `12/2` updates (`build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, `review`, `pack:smoke`).
  - Repeated `npm run review` loops completed clean after remediations, and no thread-exhaustion/tool-routing failures surfaced in this task’s runs.
- Acceptance basis: adopt `12/2` as the operating default now, with documented fallback profile (`8/1`) and explicit rollback triggers for constrained/high-risk environments.
