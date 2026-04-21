# Eminente Mirror

Task 0801 removed the checked-in public mirror payload, so fresh checkouts should regenerate `packages/eminente/public/` with the mirror scripts instead of expecting a durable `.runs/...` archive copy.

- Regenerate fresh assets: `npm run mirror:fetch -- --project eminente`
- Validate the rebuilt mirror: `npm run mirror:check -- --project eminente`
- Serve locally: `npm run mirror:serve -- --project eminente --port 4173`
