import type { LanguageAdapter } from '../types.js';

export const pythonAdapter: LanguageAdapter = {
  id: 'python-pytest',
  language: 'Python',
  description:
    'Python projects using pip for dependency management and pytest for test execution.',
  runtime: {
    name: 'python',
    version: '>=3.11'
  },
  commands: {
    build: {
      id: 'build',
      title: 'Install dependencies',
      command: 'pip',
      args: ['install', '-r', 'requirements.txt'],
      description: 'Installs project dependencies declared in requirements.txt.',
      env: {
        PIP_DISABLE_PIP_VERSION_CHECK: '1'
      },
      evaluation: {
        command: 'python3',
        args: ['scripts/build.py'],
        cwd: '{fixture}',
        requiresCleanFixture: true,
        supportsParallel: false,
        timeoutMs: 15000
      }
    },
    test: {
      id: 'test',
      title: 'Run pytest suite',
      command: 'pytest',
      args: ['-q'],
      description: 'Executes the repository pytest suite in quiet mode.',
      evaluation: {
        command: 'python3',
        args: ['scripts/test.py'],
        cwd: '{fixture}',
        requiresCleanFixture: true,
        supportsParallel: false,
        timeoutMs: 15000
      }
    }
  },
  metadata: {
    defaultPackageManager: 'pip',
    tags: ['python', 'pytest'],
    docs: ['https://docs.python.org/3/', 'https://docs.pytest.org/en/stable/']
  }
};
