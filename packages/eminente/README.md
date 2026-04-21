# Eminente Mirror

Tracked checkout only retains the mirror configuration, package harness, and a placeholder `public/` README. Task 0801 removed the checked-in public mirror payload; the prior `.runs` archive copy is not a durable repository artifact and should not be restored from ignored local output.

## Refresh And Serve

1. From the repo root, generate fresh assets: `npm run mirror:fetch -- --project eminente`
2. Serve the regenerated mirror: `npm run mirror:serve -- --project eminente --port 4173`
3. Validate the mirror when `public/` changes: `npm run mirror:check -- --project eminente`

Set `MCP_RUNNER_TASK_ID=<task-id>` before mirror commands when you need manifests routed to a task-scoped local run directory.
