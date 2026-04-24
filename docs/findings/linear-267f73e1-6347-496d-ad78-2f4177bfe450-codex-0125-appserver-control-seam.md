# CO-351 Codex 0.125 App-Server Control Seam Canary

## Decision

Adopt the Codex CLI `0.125.0` app-server seam for explicit control-host/proof usage where CO only needs the surfaces proven in this lane: Unix socket launch, `app-server proxy --sock`, schema generation, config/read under explicit untrusted project setup, permission-profile disabled thread start, explicit untrusted config preservation, resume/fork metadata loading after synthetic history injection, and bursty WebSocket command output.

This is not a blanket provider-worker supervision replacement, provider runtime promotion, or local runtime adoption. Provider workers must keep the existing `codex exec` / `codex exec resume` fallback and must not use the 0.125 app-server seam for provider runtime work until the configured follow-up evidence and normal promotion gates pass. Provider-worker supervision must not remove the exec/resume fallback or depend on sticky environments and turn-backed pagination until a configured follow-up canary proves:

1. sticky environment use with a real configured environment id; and
2. resume/fork plus `thread/turns/list` pagination against a persisted rollout with real turns.

## Release And Documentation Facts

- Local installed CLI: `/opt/homebrew/bin/codex --version` returned `codex-cli 0.125.0`.
- npm registry: `@openai/codex` latest was `0.125.0`, with `time["0.125.0"] = 2026-04-24T18:01:41.002Z`.
- GitHub release: `rust-v0.125.0` was published `2026-04-24T18:00:38Z` and was not marked prerelease or draft.
- Local help: `codex app-server --help` listed `stdio://`, `unix://`, `unix://PATH`, `ws://IP:PORT`, and `off`; `codex app-server proxy --help` exposed `--sock`.
- Documentation mismatch: the OpenAI hosted app-server docs checked during this lane did not expose `unix://` transport wording in the fetched page, while local help and the upstream `rust-v0.125.0` app-server README did.
- Protocol nuance: Unix socket and `app-server proxy --sock` traffic is WebSocket-framed over the socket/proxy stream, not newline-delimited JSON-RPC. The canary exercises that framing directly.

References:

- OpenAI app-server docs: https://developers.openai.com/codex/app-server
- Upstream 0.125 app-server README: https://github.com/openai/codex/blob/rust-v0.125.0/codex-rs/app-server/README.md
- GitHub release: https://github.com/openai/codex/releases/tag/rust-v0.125.0

## Canary Evidence

Artifacts:

- Summary: `out/linear-267f73e1-6347-496d-ad78-2f4177bfe450/manual/codex-0125-appserver-canary/runtime-canary-summary.json`
- Harness: `out/linear-267f73e1-6347-496d-ad78-2f4177bfe450/manual/codex-0125-appserver-canary/codex-0125-appserver-canary.mjs`
- Generated TypeScript: `out/linear-267f73e1-6347-496d-ad78-2f4177bfe450/manual/codex-0125-appserver-canary/generated-ts/`
- Generated JSON Schema: `out/linear-267f73e1-6347-496d-ad78-2f4177bfe450/manual/codex-0125-appserver-canary/generated-json-schema/`
- Local help captures: `app-server-help.txt` and `app-server-proxy-help.txt` in the same artifact directory.

The runtime summary status is `blocked` because the configured sticky-environment proof is incomplete. That blocker narrows the adoption boundary; it does not invalidate the socket/proxy/schema/config/permission/WebSocket surfaces that passed and are now approved for explicit CO control-host/proof usage.

| Check | Result | CO interpretation |
| --- | --- | --- |
| `codex-version` | passed | Local candidate is `codex-cli 0.125.0`. |
| `local-help-unix-transport` | passed | Local help advertises `unix://` and related listen modes. |
| `proxy-help-sock` | passed | `app-server proxy --sock` is available locally. |
| `schema-required-surfaces` | passed | Generated schemas include `thread/start`, `thread/resume`, `thread/fork`, `thread/turns/list`, `excludeTurns`, `permissionProfile`, sticky environments, command exec streaming, and `config/read` surfaces. |
| `unix-socket-listen-created` | passed | `codex app-server --listen unix://PATH` creates the socket. |
| `config-read-untrusted-project-layering` | passed | App-server config/read responds under explicit untrusted project setup. |
| `pagination-model-list-limit-one` | passed | Pagination mechanics work on `model/list` with `limit: 1` and `nextCursor`. |
| `sticky-environment-explicit-id` | blocked | `thread/start` rejected unknown environment id `co351-local-env`; this worker lacks a configured environment to prove sticky environment behavior. |
| `thread-start-permission-profile-env-disabled` | passed | `thread/start` accepted disabled permission profile and returned a thread id/path. |
| `explicit-untrusted-project-config-preserved` | passed | The project config preserved explicit untrusted state and did not silently become trusted. |
| `thread-inject-items-synthetic-history` | passed | Synthetic history injection succeeded and provided a resumable thread path without requiring a model turn. |
| `resume-fork-path-exclude-turns` | passed | `thread/resume` and `thread/fork` worked after synthetic history injection with `excludeTurns: true`; this proves metadata loading, not real-turn continuity. |
| `thread-turns-pagination-limit-one` | passed with limitation | `thread/turns/list` returned a paginated response shape, but the synthetic-history lane had `0` persisted turns; real turn-backed cursor depth remains unproven. |
| `app-server-proxy-sock` | passed | Proxy path returned auth status over WebSocket-framed proxy transport. |
| `websocket-burst-command-output` | passed | WebSocket command output streamed 13 deltas, 3200 decoded bytes, exit code 0, and the final marker was present. |

## Adoption Boundary

The app-server seam is adopted as a guarded CO control-host/proof substrate for the surfaces this lane proved:

- Unix socket/proxy transport is locally real.
- Generated protocol schemas expose the expected CO-relevant methods and fields.
- Permission-profile and explicit untrusted config behavior are visible.
- Resume/fork metadata loading works after synthetic history injection.
- Bursty WebSocket command output did not lose final output in this local stress.

It is not yet strong enough to replace provider supervision or claim full sticky/resume parity:

- Sticky environments were not proven with a configured environment.
- Turn pagination was not proven with a persisted rollout that contains real turns.
- Official hosted docs and local/upstream help still diverge on `unix://` wording, so reviewer-facing docs must avoid assuming hosted docs alone describe the socket path.

## Follow-Up Criteria

A future provider-supervision migration lane can remove the remaining fallback constraints only if it captures manifest-backed evidence for:

- `codex app-server --listen unix://PATH` plus `app-server proxy --sock` against a configured worker environment.
- `thread/start` with a real sticky environment id.
- `thread/resume`, `thread/fork`, and `thread/turns/list` pagination on a persisted rollout with at least enough turns to exercise cursoring.
- Permission-profile round-trip and explicit untrusted project config preserved across the same thread lifecycle.
- WebSocket burst behavior under the same configured lane, not just the isolated local command-output canary.
- A rollback path that keeps `codex exec` / `codex exec resume` available if app-server provider supervision fails closed.
