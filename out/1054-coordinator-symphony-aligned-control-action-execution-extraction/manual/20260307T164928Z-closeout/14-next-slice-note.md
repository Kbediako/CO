# 1054 Next Slice Note

- With preflight, outcome shaping, cancel-confirmation resolution, and execution extraction complete, the remaining `/control/action` inline surface in `controlServer.ts` is now mostly controller-owned side-effect finalization.
- The next bounded Symphony-aligned seam should not be another tiny replay tweak. The smallest useful follow-on is a controller-level finalization helper that:
  - accepts the typed execution result plus canonical ids and optional transport mutation context;
  - centralizes response and audit payload assembly around the existing outcome builders;
  - returns the data needed for persistence, runtime publish, and raw HTTP writes without taking over confirmation authority or transport nonce durability.
- `controlServer.ts` should continue to own:
  - route ordering and auth or CSRF gating;
  - request body reads and final response writes;
  - transport nonce consume and rollback durability;
  - confirmation challenge authority unless or until a larger standalone control-action controller extraction is opened as a separate slice.
