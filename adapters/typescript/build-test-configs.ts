import type { LanguageAdapter } from '../types.js';

export const typescriptAdapter: LanguageAdapter = {
  id: 'typescript-default',
  language: 'TypeScript',
  description:
    'TypeScript/Node.js projects using npm scripts for build, lint, and Vitest-based testing.',
  runtime: {
    name: 'node',
    version: '>=18.17.0'
  },
  commands: {
    build: {
      id: 'build',
      title: 'Compile TypeScript sources',
      command: 'npm',
      args: ['run', 'build'],
      description: 'Runs the project TypeScript compiler via npm scripts to emit `dist/` output.',
      evaluation: {
        cwd: '{fixture}',
        requiresCleanFixture: true,
        supportsParallel: true,
        timeoutMs: 20000
      }
    },
    test: {
      id: 'test',
      title: 'Execute unit tests with Vitest',
      command: 'npm',
      args: ['test'],
      description: 'Invokes Vitest in run mode to execute the full unit test suite.',
      evaluation: {
        cwd: '{fixture}',
        requiresCleanFixture: true,
        supportsParallel: false,
        timeoutMs: 25000
      }
    },
    lint: {
      id: 'lint',
      title: 'Lint orchestrator sources',
      command: 'npm',
      args: ['run', 'lint'],
      description: 'Runs ESLint against orchestrator sources to enforce repository guardrails.',
      evaluation: {
        cwd: '{fixture}',
        requiresCleanFixture: true,
        supportsParallel: true,
        timeoutMs: 20000
      }
    }
  },
  metadata: {
    defaultPackageManager: 'npm',
    tags: ['node', 'typescript', 'vitest'],
    docs: ['https://nodejs.org/', 'https://www.typescriptlang.org/', 'https://vitest.dev/']
  }
};
