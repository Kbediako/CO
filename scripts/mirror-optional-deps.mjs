import { createOptionalDependencyLoader } from './design/pipeline/optional-deps.js';

const DESIGN_GUIDANCE =
  'Install optional design deps with "npm run setup:design-tools" and "npx playwright install" before running mirror commands.';

const loader = createOptionalDependencyLoader({
  label: 'mirror',
  hint: DESIGN_GUIDANCE
});

export const loadCheerio = loader.loadCheerio;
export const loadPlaywright = loader.loadPlaywright;
