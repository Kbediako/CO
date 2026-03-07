# Findings - 1051 Control Action Preflight Extraction

- Approved as the next bounded seam after `1050`.
- Rationale:
  - after the confirmation-route controller family completed, the largest remaining inline route surface in `controlServer.ts` is `/control/action`;
  - the route currently mixes request parsing, session guardrails, transport hardening, replay branching, confirmation-scope transport resolution, and the final authority-bearing control mutation in one block;
  - the delegated read-only seam review approved a helper-only extraction under `orchestrator/src/cli/control/`, without weakening CO's harder authority model because final response writes, mutation, persistence, runtime publish, and audit emission can remain in `controlServer.ts`.
- Primary guardrails:
  - preserve current `/control/action` status codes, error codes, and traceability payloads exactly;
  - preserve deferred cancel transport resolution through confirmation scope;
  - preserve fail-closed transport hardening and replay behavior.
- Specific regression watchpoints:
  - canonical replay traceability must keep prior request/intention nullability semantics;
  - transport replay must prefer the replay-entry transport actor context over caller overrides;
  - session metadata rejection and camel-case alias normalization need direct unit coverage in the new helper test file.
- Explicit non-goal:
  - do not widen this slice into the final control mutation path, Telegram/Linear surfaces, or broader transport abstraction work.
