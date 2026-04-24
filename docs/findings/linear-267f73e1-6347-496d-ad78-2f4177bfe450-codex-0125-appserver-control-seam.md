# CO-351 Codex 0.125 App-Server Control Seam Canary

## Decision

Hold. Codex CLI `0.125.0` exposes useful app-server control surfaces, and the local canary passed transport, schema, permission-profile, explicit untrusted config, proxy, and bursty WebSocket output checks. It is still not clean enough to adopt as a CO provider/control workflow seam because the worker canary did not prove sticky environments or resume/fork turn pagination.

Provider workers should keep the existing `codex exec` / `codex exec resume` supervision path until a configured follow-up canary proves:

1. sticky environment use with a real configured environment id; and
2. resume/fork plus `thread/turns/list` pagination against a persisted, turn-backed rollout.

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

The runtime summary status is `blocked`, not `passed`, because required CO adoption checks are incomplete.

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
| `resume-fork-path-exclude-turns` | blocked | `thread/resume` reported no rollout for the no-turn thread id, so resume/fork continuity was not proven. |
| `thread-turns-pagination-limit-one` | blocked | Turn pagination depends on a resumable turn-backed rollout and remains unproven. |
| `app-server-proxy-sock` | passed | Proxy path returned auth status over WebSocket-framed proxy transport. |
| `websocket-burst-command-output` | passed | WebSocket command output streamed 13 deltas, 3200 decoded bytes, exit code 0, and the final marker was present. |

## Adoption Boundary

The app-server seam is a candidate control substrate only. The 0.125 canary is strong enough to keep investigating:

- Unix socket/proxy transport is locally real.
- Generated protocol schemas expose the expected CO-relevant methods and fields.
- Permission-profile and explicit untrusted config behavior are visible.
- Bursty WebSocket command output did not lose final output in this local stress.

It is not strong enough to replace provider supervision:

- Sticky environments were not proven with a configured environment.
- Resume/fork and turn pagination were not proven with a persisted rollout that contains turns.
- Official hosted docs and local/upstream help still diverge on `unix://` wording, so reviewer-facing docs must avoid assuming hosted docs alone describe the socket path.

## Follow-Up Criteria

A future adoption lane can reconsider the hold only if it captures manifest-backed evidence for:

- `codex app-server --listen unix://PATH` plus `app-server proxy --sock` against a configured worker environment.
- `thread/start` with a real sticky environment id.
- `thread/resume`, `thread/fork`, and `thread/turns/list` pagination on a persisted rollout with at least enough turns to exercise cursoring.
- Permission-profile round-trip and explicit untrusted project config preserved across the same thread lifecycle.
- WebSocket burst behavior under the same configured lane, not just the isolated local command-output canary.
- A rollback path that keeps `codex exec` / `codex exec resume` available if app-server control fails closed.
