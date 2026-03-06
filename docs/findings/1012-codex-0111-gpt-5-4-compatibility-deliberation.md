# Findings - 1012 Codex 0.111 + GPT-5.4 Compatibility Deliberation

- Date: 2026-03-06
- Task: `1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment`
- Scope: verify the real local ChatGPT-auth behavior for `gpt-5.4` / `gpt-5.4-codex`, compare it to official Codex docs, and define the CO adoption posture required to restore delegation-first orchestration.

## Audit Sources
- Local runtime probes:
  - `codex --version`
  - `codex exec --ephemeral --json -m gpt-5.4 'Reply with OK only.'`
  - `codex exec --ephemeral --json -m gpt-5.3-codex 'Reply with OK only.'`
  - `codex exec --ephemeral --json -m gpt-5.4-codex 'Reply with OK only.'`
- Local config snapshots:
  - `~/.codex/config.toml`
  - `~/.codex/agents/researcher.toml`
  - `~/.codex/agents/explorer-detailed.toml`
  - `~/.codex/agents/worker-complex.toml`
- Official docs:
  - Codex config reference: `https://developers.openai.com/codex/config-reference/`
  - Codex prompting guide: `https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide/`
  - GPT-5.3-Codex model page: `https://developers.openai.com/api/docs/models/gpt-5.3-codex`

## Fact Register

### Confirmed
- [confirmed] Local installed Codex CLI is `codex-cli 0.111.0`.
- [confirmed] Local `gpt-5.4` succeeds under the current ChatGPT-auth setup.
- [confirmed] Local `gpt-5.4-codex` fails with `The 'gpt-5.4-codex' model is not supported when using Codex with a ChatGPT account.`.
- [confirmed] Local `review_model` and the user-defined `researcher`, `explorer-detailed`, and `worker-complex` role files are currently pointed at `gpt-5.4-codex`.
- [confirmed] Official config docs explicitly document `review_model`, `forced_login_method`, and the current config key surface for `config.toml`.
- [confirmed] Official Codex docs currently publish a `gpt-5.3-codex` model page and the Codex prompting guide names `gpt-5.3-codex` as the Codex-tuned API model.
- [confirmed] No official `gpt-5.4-codex` model page was found in the current OpenAI docs search results used for this lane.
- [confirmed] CO's current docs/defaults/templates still encode a `gpt-5.3-codex` single-baseline posture and stale `0.107.0` version-policy text.

### Inferred
- [inferred] CO can adopt `gpt-5.4` across top-level, review, and high-reasoning subagent surfaces for this lane because local `gpt-5.4` probes succeed even though `gpt-5.4-codex` does not.
- [inferred] Restoring the local ChatGPT-auth environment requires changing live role/review config, not just repo docs.
- [inferred] RLM/alignment and `explorer_fast` should stay unchanged in this lane because the current compatibility evidence is about ChatGPT-auth high-reasoning Codex surfaces, not those adjacent paths.

## Deliberation Outcome
- Proceed with a `gpt-5.4` compatibility realignment:
  - top-level `model = "gpt-5.4"`,
  - `review_model = "gpt-5.4"`,
  - managed and local high-reasoning subagent roles use `gpt-5.4`,
  - user-defined high-reasoning roles under ChatGPT auth must avoid `gpt-5.4-codex`.
- Refresh CO defaults/docs/tests to reflect that `gpt-5.4` baseline.
- Repair the local home config and custom-role files so delegation-first operation is restored before the next Coordinator slice.

## Risk Controls Carried Forward
- No adoption of `gpt-5.4-codex` under ChatGPT auth.
- Record explicit override reasons wherever docs-review / delegation guard cannot run normally before the local repair lands.
- Keep historical `1004` findings as dated evidence and supersede them with this task-scoped decision.
