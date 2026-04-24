# CO-345 Evidence Book: Local Hook Impact

Date: 2026-04-24

Scope: docs-only child lane for CO-345. This page covers local Codex hook impact only. It does not change hook configuration, repo policy, README content, task packets, Linear state, or PR state.

## Bottom Line

Local hooks are an ambient host-level input, not a repo-shipped CO behavior in this child lane.

The checked-out lane contains no repo-local Codex hook file at repo .codex/hooks.json and no repo .codex/hooks scripts. The only repo-local Codex file found in this lane is `.codex/orchestrator.toml`, which enables sandbox network access. The active host has user-level hook configuration under `/Users/kbediako/.codex/hooks/`, and `codex features list` on the active `codex-cli 0.124.0` install reports `codex_hooks` as enabled.

Current conclusion: `/Users/kbediako/.codex/hooks/continue_co_orchestration.py` does not directly affect spawned subagents or Linear/provider agents under the inspected state because the hook only emits a blocking auto-continue prompt when all of these are true: hooks are enabled, the event `cwd` is inside `/Users/kbediako/Code/CO`, no stop sentinel is present, and the event `session_id` matches the configured `root_session_id`. The inspected state has `root_session_id` set, so other Codex sessions, subagent sessions, and provider-worker sessions with different ids fall through with `{"continue": true}`. If `root_session_id` is cleared later, the same hook would become broader for any hook-enabled Codex event inside the CO repo tree.

## Shared Source Anchor

The parent provided this shared source pointer:

`ctx:sha256:3a4ed07f97e8bc9dcb0c31c8110df44f9ab48d6d1652faa667b21e642c8589b9#chunk:c000001`

The parent run source file exists in the workspace-scoped `.runs` tree and records the provider-worker run metadata, artifact root, Linear issue id, and instruction hashes. This page uses that anchor plus inspected repo, local hook, and local CLI evidence.

## Official Codex Hook Semantics

Official OpenAI Codex docs describe hooks as a lifecycle extensibility framework for running deterministic scripts inside the Codex loop. The docs identify the useful hook locations as user-level hooks.json and repo-level .codex/hooks.json; if more than one hook file exists, Codex loads all matching hooks, and a higher-precedence config layer does not replace lower-precedence hooks. The docs also note that matching hooks for the same event can run concurrently, and that hooks are behind the `features.codex_hooks` flag. Sources: [Hooks](https://developers.openai.com/codex/hooks), [Advanced configuration: Hooks](https://developers.openai.com/codex/config-advanced#hooks-experimental), [Config basics: Supported features](https://developers.openai.com/codex/config-basic#supported-features).

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

Commands were run from this child workspace only unless noted.

| Evidence | Observation |
| --- | --- |
| `git status --short` | Clean before edits. |
| `find docs/book -maxdepth 2 -type f -print` | `docs/book/` did not exist before this child lane created the two scoped docs files. |
| `find . -maxdepth 4 -path '*hooks.json' -o -path '*/.codex/hooks/*' -o -path '*/hooks/*'` | No repo Codex hook file or repo Codex hook scripts were found; only sample Git hook files under dot-git hooks appeared. |
| `find .codex -maxdepth 3 -type f -print` | `.codex/orchestrator.toml` exists and contains `[sandbox] network = true`; no repo hook config was present. |
| `codex features list` | Local `codex-cli 0.124.0` reports `codex_hooks` as `stable true`. |
| `/Users/kbediako/.codex/config.toml` | `codex_hooks = true`, `multi_agent = true`, local `model = "gpt-5.5"`, `review_model = "gpt-5.5"`, and `model_reasoning_effort = "xhigh"` are configured for this host. |
| `/Users/kbediako/.codex/hooks/continue_co_orchestration.py` | The hook loads a JSON state file, checks repo containment, checks `root_session_id` when set, allows exact stop sentinels, and otherwise emits `{"decision":"block","reason":...}` with an auto-continue orchestration prompt. Exceptions fail open with `{"continue": true}`. |
| `/Users/kbediako/.codex/hooks/co_orchestration_autocontinue.json` | Current state is enabled, `repo_root` is `/Users/kbediako/Code/CO`, `max_in_progress` is `4`, and `root_session_id` is non-empty. |

## Risk Posture

The local hook surface is a real source of run variance because user-level hooks can load outside the repo. That is useful for operator safety and local automation, but it is not portable evidence that CO itself ships or requires hooks.

The parent lane should classify hook-driven observations into three categories:

| Category | Treatment |
| --- | --- |
| Repo-local hook behavior | Requires a committed or patch-visible repo-level .codex/hooks.json and scripts. Not present in this child lane. |
| User-local hook behavior | May affect local runs through user-level Codex hook config. In the inspected state it is scoped by a non-empty `root_session_id`, so different subagent/provider sessions fall through. |
| Official Codex hook capability | Cite OpenAI docs for expected semantics, but validate actual local behavior on the active CLI before depending on it. |

## Recommended Parent Handling

- Preserve this page as evidence that this child lane found no repo-local hook surface.
- Keep the local auto-continue hook out of shipped README/setup guidance. It is a local operator guard, not a downstream CO default.
- If a future issue wants broader local auto-continue behavior, require a separate governed lane because clearing `root_session_id` would broaden the hook to any hook-enabled Codex session inside the CO repo tree.
- If CO wants repo-governed hooks, open a separate docs-first implementation lane that owns repo-level hook configuration, hook scripts, cross-platform policy, and focused hook tests.
- For adoption canaries, compare a normal local run against a run with `--disable codex_hooks` when the goal is to isolate hook-driven behavior from Codex CLI behavior.

## Sources

- OpenAI Codex Hooks: https://developers.openai.com/codex/hooks
- OpenAI Codex Advanced Configuration, Hooks: https://developers.openai.com/codex/config-advanced#hooks-experimental
- OpenAI Codex Config Basics, Supported features: https://developers.openai.com/codex/config-basic#supported-features
