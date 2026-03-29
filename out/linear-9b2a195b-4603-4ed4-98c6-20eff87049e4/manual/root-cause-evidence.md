# CO-33 Root Cause Evidence

Date: 2026-03-28
Issue: `CO-33` / `9b2a195b-4603-4ed4-98c6-20eff87049e4`

## Evidence Sources

- Provider-worker manifest:
  `.runs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/cli/2026-03-28T09-08-12-918Z-060f9d7e/manifest.json`
- Provider-worker Linear audit:
  `.runs/linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21/cli/2026-03-28T09-08-12-918Z-060f9d7e/provider-linear-worker-linear-audit.jsonl`
- Control-host intake state:
  `.runs/local-mcp/cli/control-host/provider-intake-state.json`
- Direct raw Linear GraphQL reproduction during this turn at `2026-03-28T11:36:21Z`

## Observations

1. The live `CO-31` provider-worker lane had already been claimed and was being surfaced as active by control-host state.
2. The provider-worker audit shows `issue-context` eventually succeeding, while same-attempt `transition` and `upsert-workpad` calls fail repeatedly before later succeeding after the hourly reset window.
3. A same-run reproduction against `CO-33` itself showed the packaged `issue-context` read succeeding while a concurrent `upsert-workpad` write failed with `linear_request_failed`.
4. A direct raw GraphQL reproduction during this turn exposed the upstream failure class that the packaged path had flattened:
   - HTTP status: `400`
   - GraphQL error extension code: `RATELIMITED`
   - `retry-after: 3600`
   - `x-ratelimit-requests-limit: 5000`
   - `x-ratelimit-requests-remaining: 0`
   - `x-ratelimit-requests-reset: 1774701380970`
   - `x-request-id`: captured during the reproduction and surfaced in the new facade error mapping
5. The reset header corresponds to `2026-03-28T12:36:20.970Z`, which matches the later-success pattern visible in the earlier provider-worker audit.

## Root Cause Classification

The active-lane mutation failures were caused by Linear hourly request-budget exhaustion plus redundant live mutation preflights, not by authentication drift or a malformed mutation contract.

- Primary upstream cause:
  Linear returned rate-limit GraphQL errors on writes, but the client treated the non-2xx response as a generic request failure and discarded the GraphQL body plus response headers.
- Amplifying local cause:
  After a successful `issue-context` read, the provider-worker still performed another live preflight read before `transition` and `upsert-workpad`, increasing request pressure in the same attempt.
- Operator impact:
  Control-host truth surfaces could show an issue as active while Linear remained in `Ready` and lacked the workpad comment because the write-back mutation path lost the real failure class and spent budget on extra reads.

## Repair Direction Captured In This Lane

- Preserve GraphQL error payloads and relevant rate-limit headers on non-2xx Linear responses.
- Map upstream `RATELIMITED` failures to explicit provider-worker `linear_rate_limited` errors with actionable retry metadata.
- Cache successful provider-worker `issue-context` results per run, then reuse and patch that cache for same-attempt `transition` and `upsert-workpad` calls instead of forcing another live read.

## Remaining Live Verification Constraint

At the time this artifact was written, the current hour's Linear request window had not yet reset, so another live workpad write would likely fail until at least `2026-03-28T12:36:20.970Z`.
