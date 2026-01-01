import type { LanguageAdapter } from '../types.js';
import { withFixtureEvaluation } from '../lib/command-defaults.js';

export const goAdapter: LanguageAdapter = {
  id: 'go-module',
  language: 'Go',
  description: 'Go modules using go build/go test for compilation and validation.',
  runtime: {
    name: 'go',
    version: '>=1.22'
  },
  commands: {
    build: {
      id: 'build',
      title: 'Compile Go modules',
      command: 'go',
      args: ['build', './...'],
      description: 'Compiles all Go packages within the module to ensure sources are valid.',
      evaluation: withFixtureEvaluation({
        supportsParallel: true,
        timeoutMs: 15000
      })
    },
    test: {
      id: 'test',
      title: 'Run go test',
      command: 'go',
      args: ['test', './...'],
      description: 'Runs unit tests across all Go packages with default settings.',
      evaluation: withFixtureEvaluation({
        supportsParallel: true,
        timeoutMs: 20000
      })
    },
    lint: {
      id: 'lint',
      title: 'Run go vet',
      command: 'go',
      args: ['vet', './...'],
      description: 'Runs `go vet` to spot suspicious constructs across packages.',
      evaluation: withFixtureEvaluation({
        supportsParallel: true,
        timeoutMs: 15000
      })
    }
  },
  metadata: {
    defaultPackageManager: 'go',
    tags: ['go', 'modules'],
    docs: ['https://go.dev/doc/modules/managing-dependencies']
  }
};
