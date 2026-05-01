# Historical CO-345 Evidence Book: Codex CLI 0.124.0 Adoption Evidence

Scope: archived CO-345 README/book evidence page. This page preserves the CO-341/CO-345 `codex-cli 0.124.0` adoption step against repo evidence and official OpenAI Codex docs. Current posture has since moved: local ChatGPT-auth/appserver posture now uses `0.128.0`, release-facing package/downstream-smoke compatibility intentionally holds on `0.125.0`, and cloud execution remains separately pinned to `0.124.0`. This archive page does not change runtime defaults and is not current posture guidance.

## Bottom Line

CO adopted Codex CLI `0.124.0` as the repo compatibility target during CO-341/CO-345.

That adoption was intentionally narrow. It promoted `0.124.0` after CO-341 runtime, cloud, pack-smoke, and review evidence while keeping packaged/generated model defaults on portable `gpt-5.4` with `model_reasoning_effort = "xhigh"`. Local ChatGPT-auth `gpt-5.5` / `xhigh` remained a marker-backed local opt-in rather than the generic shipped default. Current local ChatGPT-auth appserver/model posture on `0.128.0`, package/downstream-smoke `0.125.0` compatibility hold, and the cloud-only `0.124.0` candidate split now live in `docs/guides/codex-version-policy.md`.

## Evidence Boundary

Host-specific absolute paths and local account state stay in the CO-345 task packet, Linear workpad, and run artifacts. This shipped page records the portable adoption decision and the evidence classes without exposing operator-local paths.

## Recorded Evidence Snapshot

Commands were run from the issue workspace or the active operator environment during CO-345/CO-341 evidence gathering.

| Evidence | Observation |
| --- | --- |
| `which codex` | The active executable was identified before posture checks. |
| `codex --version` | Active executable reports `codex-cli 0.124.0`. |
| `codex login status` | Local CLI auth state was checked before model/posture conclusions. |
| `codex debug models` | Live model catalog includes `gpt-5.4`, `gpt-5.5`, and `gpt-5.3-codex-spark`; `gpt-5.4` and `gpt-5.5` expose `low/medium/high/xhigh` reasoning levels. |
| `codex debug models --bundled` | Bundled catalog filtering found `gpt-5.4`; local `gpt-5.5` is not treated as a portable bundled default. |
| User-level Codex config | The inspected operator environment has an explicit local `gpt-5.5` / `xhigh` opt-in; this is not a packaged/generated default. |
| `codex features list` | Local feature list reports `multi_agent`, `plugins`, `apps`, `tool_search`, and `codex_hooks` as stable/enabled; `js_repl` and `memories` are experimental/enabled. |
| `codex exec --help` | Supports `[PROMPT]`, stdin appending, `resume`, `review`, `--output-schema`, `--json`, `--ignore-user-config`, and feature toggles. |
| `codex review --help` | Supports `[PROMPT]`, `--uncommitted`, `--base`, `--commit`, `--title`, and feature toggles. |

## Official OpenAI Docs Context

Official Codex docs describe the CLI setup, ChatGPT/API-key auth, app-server APIs, model/config fields, feature flags, plugin marketplace operations, skills listing, and feature maturity levels. Those docs support treating the 0.124-era local surfaces as real capabilities, while still requiring repo-specific evidence before CO changes shipped defaults or provider-worker supervision.

Relevant docs:

- [Codex CLI setup](https://developers.openai.com/codex/cli#cli-setup)
- [Codex auth](https://developers.openai.com/codex/auth#sign-in-with-chatgpt)
- [Codex CLI reference: login](https://developers.openai.com/codex/cli/reference#codex-login)
- [Codex config reference](https://developers.openai.com/codex/config-reference#configtoml)
- [Codex app-server](https://developers.openai.com/codex/app-server)
- [Codex feature maturity](https://developers.openai.com/codex/feature-maturity)

## Repo Adoption Matrix

| Surface | Current posture on `main` | Classification |
| --- | --- | --- |
| Compatibility target | This page records the previous `0.124.0` target evidence; current local ChatGPT-auth appserver/model posture on `0.128.0`, package/downstream-smoke `0.125.0` compatibility hold, and the cloud-only `0.124.0` candidate split live in `docs/guides/codex-version-policy.md`. | Historical evidence |
| Packaged/generated model defaults | `gpt-5.4` with `model_reasoning_effort = "xhigh"`. | Adopted, intentionally portable |
| Local `gpt-5.5` / `xhigh` | Allowed after live access smoke plus `[codex_orchestrator] local_model_opt_in = "gpt-5.5"`. | Adopted as local opt-in |
| Generic shipped `gpt-5.5` default | Not promoted because bundled/cloud/API portability remains unproven. | Held |
| Appserver runtime | Local appserver remains the default runtime path. | Adopted |
| `executionMode=cloud` + `runtimeMode=appserver` | Still fails fast as unsupported. | Held |
| Provider-worker supervision | Still uses `codex exec` / `codex exec resume` until a separate app-server control seam lands. | Held |
| `explorer_fast` | Remains `gpt-5.3-codex-spark` for file/codebase search only. | Adopted exception |
| Marketplace/plugin guidance | npm remains baseline; Codex `0.121.0` accepts `codex marketplace add` or `codex plugin marketplace add`, while `0.122.0+` uses `codex plugin marketplace add`. | Adopted |

## Follow-Up Assessment

CO-345 did not find a new unresolved `0.124.0` adoption blocker that belonged in a follow-up issue.

The meaningful holds are already intentional posture boundaries:

- Do not promote `gpt-5.5` as a generic shipped default from local ChatGPT-auth evidence alone.
- Do not move provider workers from `codex exec` / `codex exec resume` without a separate governed app-server control seam.
- Do not treat experimental or under-development feature flags as default CO behavior without task-scoped evidence.

Those holds were policy, not README-cleanup defects. Current posture and newer holds are recorded in `docs/guides/codex-version-policy.md`.
