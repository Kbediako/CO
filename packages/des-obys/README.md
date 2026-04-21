# Des-Obys Mirror

Task 0801 removed the checked-in static mirror payload, so fresh checkouts should regenerate `packages/des-obys/public/` with the mirror scripts instead of expecting a durable `.runs/...` archive copy.

- Regenerate fresh assets: `npm run mirror:fetch -- --project des-obys`
- Validate the rebuilt mirror: `npm run mirror:check -- --project des-obys`
- Serve locally: `npm run mirror:serve -- --project des-obys --port 4173`
