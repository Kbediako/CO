# TECH_SPEC - Coordinator Symphony-Aligned Question Queue Controller Extraction

## Scope

- Extract the `/questions*` route cluster from `controlServer.ts` into a dedicated questions controller.
- Preserve current queue mutation behavior, payload shapes, child-question resolution, and status codes.
- Leave `/control/action`, `/confirmations*`, `/security/violation`, `/delegation/register`, `/ui`, `/auth/session`, `/events`, and `/api/v1/*` untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/questions.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated questions controller module for the `/questions*` subtree.
2. Move route-local request parsing, queue mutation calls, child-question resolution, and response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the queue/runtime helpers it needs for the questions subtree.
4. Keep `controlServer.ts` responsible for:
   - top-level route ordering,
   - auth + CSRF ordering,
   - runner-only gating,
   - question expiry/background helpers,
   - runtime publish hooks and Telegram projection signaling that already surround question mutations,
   - `/control/action`,
   - `/confirmations*`,
   - `/security/violation`,
   - `/delegation/register`,
   - `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*`.

## Constraints

- No `/questions*` contract regressions for status codes, payload shape, or queue mutation semantics.
- No auth, CSRF, or runner-only access-policy changes.
- No changes to background question expiry behavior or to the question queue data model.
- No widening into `/control/action` transport/idempotency logic.

## Validation

- Targeted `ControlServer` regressions covering question list/read plus enqueue/answer/dismiss behavior after extraction.
- Add one direct unit test file for the new questions controller covering route-local parsing and response shaping.
- Manual mock artifact confirming the extracted controller preserves the questions response contract.
- Standard validation lane before closeout, including `npm run pack:smoke` because packaged CLI paths are touched in this controller-thinning slice.
