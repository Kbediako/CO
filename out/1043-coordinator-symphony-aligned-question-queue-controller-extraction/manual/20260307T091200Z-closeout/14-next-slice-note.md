# 1043 Next Slice Note

- Recommended next seam: the inline `/security/violation` route in `orchestrator/src/cli/control/controlServer.ts`.
- Why it is next: after extracting `/api/v1/*`, `/ui/data.json`, `/auth/session`, `/integrations/linear/webhook`, `/events`, and `/questions*`, `/security/violation` is the smallest remaining cohesive HTTP adapter boundary that does not widen into the harder authority paths around control mutation, confirmation nonce flow, or delegation-token issuance.
- Keep in `controlServer.ts`: top-level route ordering, auth/runner-only gating, broader control-plane policy, shared expiry/background hooks, and the full `/control/action`, `/confirmations*`, and `/delegation/register` authority paths.
- Candidate task slug: `1044-coordinator-symphony-aligned-security-violation-controller-extraction`.
