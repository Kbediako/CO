# 1035 Next Slice Note

- Next bounded Symphony-aligned step: extract a dedicated compatibility issue index / presenter helper from `observabilityReadModel.ts`.
- Why this is next:
  - `1035` made canonical lookup, alias resolution, and representative selection explicit,
  - the remaining complexity is now concentrated in one read-model file rather than spread across the route surface,
  - extracting the compatibility-only presenter/index would tighten the Symphony-style presenter/controller boundary without changing authority or transport behavior.
- Guardrails for the next slice:
  - keep `/ui/data.json`, Telegram oversight, and dispatch evaluation on the selected-run seam,
  - keep `/api/v1/dispatch` as a CO-only extension,
  - do not broaden into scheduler ownership or live provider ingestion.
