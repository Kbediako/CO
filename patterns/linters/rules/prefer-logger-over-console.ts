import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/openai/codex-orchestrator/tree/main/patterns/linters/rules/${name}`
);

const DISALLOWED_METHODS = new Set(['log', 'info', 'warn', 'error', 'debug']);

export default createRule({
  name: 'prefer-logger-over-console',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage console usage in favor of the orchestrator logger.',
      recommended: 'recommended'
    },
    messages: {
      preferLogger:
        'Replace console.{{method}} with the shared orchestrator logger to ensure run output is captured.'
    },
    schema: [],
    hasSuggestions: false
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'console' ||
          node.callee.property.type !== 'Identifier'
        ) {
          return;
        }

        const method = node.callee.property.name;
        if (!DISALLOWED_METHODS.has(method)) {
          return;
        }

        context.report({
          node,
          messageId: 'preferLogger',
          data: { method }
        });
      }
    };
  }
});
