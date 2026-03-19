# 1304 Elegance Review

- Locked invariants:
  - the exact issue-by-id GraphQL contract had to change from `ID!` to `String!`
  - surrounding tracked-issue parsing and scope checks had to stay untouched
  - live validation could report a new downstream blocker, but the code fix itself had to stay narrow
- Simplification result:
  - kept the runtime change to a single query literal edit in `orchestrator/src/cli/control/linearDispatchSource.ts`
  - kept regression coverage to a single additional assertion in `orchestrator/tests/LinearDispatchSource.test.ts`
  - did not add helper layers, branching, feature flags, or fallback logic around the provider path
- Residual complexity intentionally kept:
  - the 1304 docs packet and 1303 follow-up note remain because the live rerun exposed a real new lane boundary and audit traceability matters more than collapsing docs into the original packet
  - the live blocker is left as an operational delivery problem rather than patched around locally, because bypassing public Linear delivery would violate the requested autonomous-provider validation path
