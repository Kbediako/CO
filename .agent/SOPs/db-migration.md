# DB Migration SOP

## Added by Bootstrap 2025-10-16

1. Plan expand/contract steps with versioned scripts and feature flags.
2. Take environment-appropriate backups or snapshots before applying changes.
3. Run automated verification: schema diff, smoke tests, and targeted queries.
4. Monitor runtime metrics and error budgets while the migration is live.
5. Execute the rollback plan immediately if verification fails or metrics regress.
