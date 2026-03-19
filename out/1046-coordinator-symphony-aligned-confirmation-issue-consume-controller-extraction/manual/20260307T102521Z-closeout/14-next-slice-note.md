# 1046 Next Slice Note

- Recommended next seam: the inline `/confirmations/validate` route in `orchestrator/src/cli/control/controlServer.ts`.
- Why it is next: after extracting `/confirmations/issue` and `/confirmations/consume`, `/confirmations/validate` is the remaining bounded confirmation adapter branch that still owns route-local parsing, nonce validation, persistence, and response shaping without yet widening into the more authority-bearing `/confirmations/approve` or `/control/action` flows.
- Keep in `controlServer.ts`: top-level route ordering, auth and runner-only gating, the `/confirmations/approve` auto-resolution logic, broader control-plane policy, shared expiry/background hooks, and `/control/action`.
- Candidate task slug: `1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction`.
