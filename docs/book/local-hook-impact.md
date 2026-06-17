# CO-345 Evidence Book: Local Hook Impact

Original date: 2026-04-24
Reviewed: 2026-06-17

Scope: docs-only child lane for CO-345. This page covers local Codex hook impact only. It does not change hook configuration, repo policy, README content, task packets, Linear state, or PR state.

## Bottom Line

Local hooks are an ambient host-level input, not a repo-shipped CO behavior in this child lane.

The checked-out lane contains no repo-level Codex hooks config file and no repo-local Codex hook scripts. It does contain the tracked utility script `scripts/hooks/continue_co_orchestration.py`, but no repo config wires that script into Codex hooks in this lane. The inspected operator environment has user-level hook configuration under `${CODEX_HOME:-~/.codex}/hooks/`; current `codex-cli 0.140.0` reports `hooks` as stable true, while the original CO-345 evidence used the older `codex_hooks` feature name on `0.124.0`.

Current conclusion: the inspected user-level `continue_co_orchestration.py` hook does not directly affect spawned subagents or Linear/provider agents under the inspected state because the hook only emits a blocking auto-continue prompt when hooks are enabled, the event `cwd` is inside the local CO checkout, no stop sentinel is present, and the event `session_id` matches the configured `root_session_id`. The inspected state has `root_session_id` set, so other Codex sessions, subagent sessions, and provider-worker sessions with different ids fall through with `{"continue": true}`. If `root_session_id` is cleared later, the same hook would become broader for any hook-enabled Codex event inside the CO repo tree.

## Evidence Boundary

Host-specific absolute paths and local state values stay in the CO-345 task packet, Linear workpad, and run artifacts. This shipped page records the portable conclusion and the evidence classes without exposing operator-local paths.

## Official Codex Hook Semantics

Official OpenAI Codex docs describe hooks as a lifecycle extensibility framework for running deterministic scripts inside the Codex loop. The docs identify the useful hook locations as user-level hooks.json and repo-level .codex/hooks.json; if more than one hook file exists, Codex loads all matching hooks, and a higher-precedence config layer does not replace lower-precedence hooks. The docs also note that matching hooks for the same event can run concurrently, and current local `codex features list` exposes the feature as `hooks`. Sources: [Hooks](https://developers.openai.com/codex/hooks), [Advanced configuration: Hooks](https://developers.openai.com/codex/config-advanced#hooks-experimental), [Config basics: Supported features](https://developers.openai.com/codex/config-basic#supported-features).

Important limits from the same docs:

| Hook area | Documented behavior | CO-345 impact |
| --- | --- | --- |
| Load path | Codex discovers hooks next to active config layers, including user-level and repo-level files. | A user-level hook can affect this lane even when the repo does not ship a hook file. |
| Multiple hooks | All matching hooks load; higher-precedence config does not replace lower-precedence hooks. | Adding a repo hook in a later issue would not automatically disable a user hook. |
| Command hooks | Multiple matching command hooks for one event launch concurrently. | Hook ordering should not be used as a correctness dependency. |
| `PreToolUse` | Current docs frame Bash interception as incomplete and a guardrail, not a complete enforcement boundary. | A hook can add safety signal but does not replace CO approval, sandbox, and review gates. |
| `PostToolUse` | It cannot undo side effects from a command that already ran. | It is evidence/continuation signal, not rollback. |
| Windows | Hooks are currently disabled on Windows in the docs. | Cross-platform claims need separate validation before repo-level hook adoption. |

## Lane Evidence

Commands were run from the issue workspace only, unless noted.

| Evidence | Observation |
| --- | --- |
| `git status --short` | Clean before edits. |
| `find docs/book -maxdepth 2 -type f -print` | `docs/book/` did not exist before this child lane created the two scoped docs files. |
| `find . -maxdepth 4 -path '*hooks.json' -o -path '*/.codex/hooks/*' -o -path '*/hooks/*'` | No repo Codex hook config was found under `.codex`; `scripts/hooks/continue_co_orchestration.py` exists as a tracked utility/script surface and is not wired by repo config in this lane. |
| `find .codex -maxdepth 3 -type f -print` | `.codex/orchestrator.toml` exists and contains `[sandbox] network = true`; no repo hook config was present. |
| `codex features list` | Local `codex-cli 0.140.0` reports `hooks` as `stable true`; original CO-345 evidence on `0.124.0` reported `codex_hooks` as `stable true`. |
| User-level Codex config | `codex_hooks` and `multi_agent` are enabled in the inspected operator environment. |
| User-level hook script | The installed user-level hook is the operative local hook; it differs from the tracked utility script and adds `root_session_id` scoping plus memory-citation handling. It checks repo containment, allows exact stop sentinels, and otherwise emits the auto-continue orchestration prompt. Exceptions fail open with `{"continue": true}`. |
| User-level hook state | Current state is enabled for the local CO checkout, and `root_session_id` is non-empty. |

## Risk Posture

The local hook surface is a real source of run variance because user-level hooks can load outside the repo. That is useful for operator safety and local automation, but it is not portable evidence that CO itself ships or requires hooks.

The parent lane should classify hook-driven observations into three categories:

| Category | Treatment |
| --- | --- |
| Repo-local hook behavior | Requires committed or patch-visible repo-level Codex hook wiring. Not present in this child lane; the tracked `scripts/hooks/` utility is not active by itself. |
| User-local hook behavior | May affect local runs through user-level Codex hook config. In the inspected state it is scoped by a non-empty `root_session_id`, so different subagent/provider sessions fall through. |
| Official Codex hook capability | Cite OpenAI docs for expected semantics, but validate actual local behavior on the active CLI before depending on it. |

## Recommended Parent Handling

- Preserve this page as evidence that this child lane found no repo-level Codex hook config, while separately noting the tracked `scripts/hooks/` utility script.
- Keep the local auto-continue hook out of shipped README/setup guidance. It is a local operator guard, not a downstream CO default.
- If a future issue wants broader local auto-continue behavior, require a separate governed lane because clearing `root_session_id` would broaden the hook to any hook-enabled Codex session inside the CO repo tree.
- If CO wants repo-governed hooks, open a separate docs-first implementation lane that owns repo-level hook configuration, hook scripts, cross-platform policy, and focused hook tests.
- For adoption canaries, compare a normal local run against a run with `--disable hooks` when the goal is to isolate hook-driven behavior from Codex CLI behavior.

## Sources

- OpenAI Codex Hooks: https://developers.openai.com/codex/hooks
- OpenAI Codex Advanced Configuration, Hooks: https://developers.openai.com/codex/config-advanced#hooks-experimental
- OpenAI Codex Config Basics, Supported features: https://developers.openai.com/codex/config-basic#supported-features
