# Action Plan — Implementation Docs Archive Allowlist (Task 0927)

## Goal
Add an allowlist to the implementation-docs archive policy and wire it into the archiver workflow.

## Run Manifest Links
- Pre-change docs-review: `.runs/0927-implementation-docs-archive-allowlist/cli/2025-12-31T07-34-54-456Z-dfb518d8/manifest.json`
- Post-change docs-review: `.runs/0927-implementation-docs-archive-allowlist/cli/2025-12-31T07-44-44-267Z-fd2c1a98/manifest.json`
- Implementation-gate: `.runs/0927-implementation-docs-archive-allowlist/cli/2025-12-31T07-45-19-629Z-0e122538/manifest.json`
- Review agent manifest: `.runs/0927-implementation-docs-archive-allowlist-review/cli/2025-12-31T07-44-08-552Z-31e64c57/manifest.json`

## Plan
1. Update policy + archiver to support allowlisted task keys and doc paths.
2. Update documentation and task mirrors.
3. Validate via docs-review and implementation-gate.
4. Open PR, monitor checks, and merge when green.

## Risks
- Allowlist entries could be too broad, preventing necessary archiving.
- Policy parsing must remain backward compatible for empty allowlists.

## Rollback
- Revert the policy field and archiver allowlist logic; existing stubs remain intact.
