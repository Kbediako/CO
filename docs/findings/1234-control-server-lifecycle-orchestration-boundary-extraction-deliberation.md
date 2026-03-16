# 1234 Deliberation: Control Server Lifecycle Orchestration Boundary Extraction

- Risk stays below the full-deliberation threshold because this is a bounded architectural extraction with clear rollback and no direct production operator input required.
- Local inspection plus bounded scout evidence agree that the request/action dispatch family is already frozen, while the control-server host-runtime layer still carries a real startup/close ownership boundary.
- The strongest reason to move here next is that bind ordering, readiness/auth metadata coupling, bootstrap assembly, and teardown flow still share one lifecycle surface across several adjacent files.
- The main risk is sequencing drift: mis-ordering listener bind, bootstrap persistence, expiry/telegram lifecycle startup, or close teardown could leave live state and persisted metadata out of sync.
