# 1044 Next Slice Note

- Recommended next seam: the inline `/delegation/register` route in `orchestrator/src/cli/control/controlServer.ts`.
- Why it is next: after extracting `/api/v1/*`, `/ui/data.json`, `/auth/session`, `/integrations/linear/webhook`, `/events`, `/questions*`, and `/security/violation`, `/delegation/register` is the next smallest remaining cohesive HTTP adapter boundary.
- Keep in `controlServer.ts`: top-level route ordering, auth/runner-only gating, broader control-plane policy, shared expiry/background hooks, and the full `/control/action` and `/confirmations*` authority paths.
- Candidate task slug: `1045-coordinator-symphony-aligned-delegation-register-controller-extraction`.
