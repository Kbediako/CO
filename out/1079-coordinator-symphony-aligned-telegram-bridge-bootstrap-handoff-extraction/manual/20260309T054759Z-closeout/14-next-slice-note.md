# 1079 Next Slice Note

- Recommended next slice: `Coordinator Symphony-Aligned Bootstrap Metadata Persistence Extraction`
- Why this is next:
  - After `1079`, `controlServer.ts` no longer assembles the Telegram bootstrap handoff inline.
  - The next smallest remaining seam is in `controlServerBootstrapLifecycle.ts`, which still combines bootstrap metadata persistence (`control-auth.json`, `control-endpoint.json`, chmod, control snapshot flush) with bridge startup and bridge attachment.
  - Extracting only the metadata persistence helper keeps the lifecycle more coordinator-shaped without widening into bridge runtime, polling, or subscription semantics.
- Proposed scope:
  - add one helper near `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts` for bootstrap metadata persistence,
  - keep lifecycle startup order and bridge attach behavior unchanged,
  - extend the focused lifecycle tests only where the extracted persistence helper needs direct coverage.
- Explicit non-goals:
  - Telegram bridge runtime or polling changes,
  - subscription fan-out behavior changes,
  - authenticated route or control mutation changes,
  - broader refactors of `controlServer.ts`.
