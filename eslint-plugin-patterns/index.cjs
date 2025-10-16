const path = require('node:path');

function loadRules() {
  const distPath = path.resolve(__dirname, '../dist/patterns/linters/index.js');
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(distPath).rules;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `patterns plugin requires built artifacts at ${distPath}. Run "npm run build:patterns" before linting.`
      );
    }
    throw error;
  }
}

const rules = loadRules();

module.exports = {
  rules,
  configs: {
    recommended: {
      rules: {
        'patterns/prefer-logger-over-console': 'warn'
      }
    }
  }
};
