# 1304 Live Rerun Evidence

## Control Host

- Current local endpoint metadata: `.runs/local-mcp/cli/control-host/control_endpoint.json`
  - `base_url`: `http://127.0.0.1:59254`
- Current host auth token path: `.runs/local-mcp/cli/control-host/control_auth.json`
- Current host config seed: `.runs/local-mcp/cli/control-host/control.json`
  - `dispatch_pilot.enabled=true`
  - provider binding present for Linear workspace/team/project

## Public Ingress And Delivery

- Public HTTPS ingress was repointed to the restarted host port before the final rerun.
- `.runs/local-mcp/cli/control-host/linear-advisory-state.json` now records accepted signed/manual replays and accepted real Linear deliveries.
- Latest recorded real delivery at closeout:
  - `delivery_id`: `0f42f69c-f7a5-428e-b39f-2bdf759c524f`
  - `result`: `accepted`
  - `reason`: `linear_delivery_accepted`
  - tracked issue: `CO-1`

## Provider Intake Ledger

- `.runs/local-mcp/cli/control-host/provider-intake-state.json` now records two claims:
  - `linear:8c4a8de9-45b2-40ef-b295-bd37a21d1155` -> `CO-1`
  - `linear:856c1318-524f-4db3-8d4a-b357ec51c304` -> `CO-2`
- `CO-1` claim state at closeout:
  - `state`: `running`
  - `reason`: `provider_issue_rehydrated_active_run`
  - `run_manifest_path`: `/Users/kbediako/Code/CO/.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/2026-03-19T11-53-41-813Z-62a676f9/manifest.json`
- `CO-2` claim state at closeout:
  - `state`: `resumable`
  - `reason`: `provider_issue_rehydrated_resumable_run`
  - `run_manifest_path`: `/Users/kbediako/Code/CO/.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-19T11-53-42-683Z-10f53643/manifest.json`

## Child Run Outcome

- `CO-1` child run manifest:
  - `/Users/kbediako/Code/CO/.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/2026-03-19T11-53-41-813Z-62a676f9/manifest.json`
  - `status`: `failed`
  - `status_detail`: `stage:delegation-guard:failed`
  - `resume_events[0].reason`: `provider-accepted-issue`
- `CO-2` child run manifest:
  - `/Users/kbediako/Code/CO/.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-19T11-53-42-683Z-10f53643/manifest.json`
  - `status`: `failed`
  - `status_detail`: `stage:delegation-guard:failed`

## Read Surface

- Local authenticated `GET /api/v1/dispatch` now returns:
  - `dispatch_pilot.status`: `ready`
  - `reason`: `recommendation_available`
  - `issue_identifier`: `CO-1`

## Closeout Interpretation

- The `1304` fix succeeded at the intended contract boundary:
  - webhook delivery now reaches the host
  - tracked-issue lookup no longer fails on `ID!` vs `String!`
  - provider-intake claims and child run mapping now occur
- The next blocker is downstream of `1304`:
  - autonomous child runs currently fail at `stage:delegation-guard:failed`
