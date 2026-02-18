import { describe, expect, it, vi } from 'vitest';

import { formatMcpEnableSummary, runMcpEnable, type McpEnableOptions } from '../src/cli/mcpEnable.js';

type CommandResult = { exitCode: number; stdout: string; stderr: string };

function buildRunner(steps: Array<CommandResult | ((args: string[]) => CommandResult)>) {
  const queue = [...steps];
  return vi.fn(async (request: { command: string; args: string[]; env: NodeJS.ProcessEnv }) => {
    const next = queue.shift();
    if (!next) {
      return { exitCode: 1, stdout: '', stderr: 'unexpected command' };
    }
    if (typeof next === 'function') {
      return next(request.args);
    }
    return next;
  });
}

function baseOptions(partial: Partial<McpEnableOptions> = {}): McpEnableOptions {
  return {
    env: { PATH: process.env.PATH ?? '' },
    ...partial
  };
}

describe('runMcpEnable', () => {
  it('plans enable commands for disabled servers by default', async () => {
    const runner = buildRunner([
      {
        exitCode: 0,
        stdout: JSON.stringify([
          {
            name: 'delegation',
            enabled: false,
            transport: {
              type: 'stdio',
              command: 'node',
              args: ['scripts/delegation-server.mjs'],
              env: { DELEGATION_MODE: 'full' }
            }
          }
        ]),
        stderr: ''
      }
    ]);

    const result = await runMcpEnable(baseOptions({ commandRunner: runner }));

    expect(result.status).toBe('planned');
    expect(result.targets).toEqual(['delegation']);
    expect(result.actions).toEqual([
      expect.objectContaining({
        name: 'delegation',
        status: 'planned'
      })
    ]);
    expect(result.actions[0]?.command_line).toContain('mcp add delegation');
    expect(result.actions[0]?.command_line).toContain('scripts/delegation-server.mjs');
    expect(result.actions[0]?.command_line).toContain('DELEGATION_MODE=<redacted>');
    expect(result.actions[0]?.command_line).not.toContain('DELEGATION_MODE=full');

    const summary = formatMcpEnableSummary(result).join('\n');
    expect(summary).toContain('MCP enable: planned');
    expect(summary).toContain('Run with --yes to apply.');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('applies requested servers and reports missing/already-enabled states', async () => {
    const runner = buildRunner([
      {
        exitCode: 0,
        stdout: JSON.stringify([
          {
            name: 'playwright',
            enabled: false,
            transport: {
              type: 'streamable_http',
              url: 'https://mcp.example.com/playwright'
            }
          },
          {
            name: 'delegation',
            enabled: true,
            transport: { type: 'stdio', command: 'node', args: ['scripts/delegation-server.mjs'] }
          }
        ]),
        stderr: ''
      },
      (args) => {
        expect(args).toEqual([
          'mcp',
          'add',
          'playwright',
          '--url',
          'https://mcp.example.com/playwright'
        ]);
        return { exitCode: 0, stdout: '', stderr: '' };
      }
    ]);

    const result = await runMcpEnable(
      baseOptions({
        apply: true,
        serverNames: ['playwright', 'unknown', 'delegation'],
        commandRunner: runner
      })
    );

    expect(result.status).toBe('applied');
    expect(result.targets).toEqual(['playwright', 'unknown', 'delegation']);
    expect(result.actions).toEqual([
      { name: 'playwright', status: 'enabled' },
      expect.objectContaining({ name: 'unknown', status: 'missing' }),
      { name: 'delegation', status: 'already_enabled' }
    ]);
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('redacts sensitive flag values in displayed command lines', async () => {
    const runner = buildRunner([
      {
        exitCode: 0,
        stdout: JSON.stringify([
          {
            name: 'context7',
            enabled: false,
            transport: {
              type: 'stdio',
              command: 'npx',
              args: ['-y', '@upstash/context7-mcp', '--api-key', 'ctx7-secret']
            }
          }
        ]),
        stderr: ''
      }
    ]);

    const result = await runMcpEnable(baseOptions({ commandRunner: runner }));
    const commandLine = result.actions[0]?.command_line ?? '';
    expect(commandLine).toContain('<redacted>');
    expect(commandLine).not.toContain('--api-key');
    expect(commandLine).not.toContain('ctx7-secret');
  });

  it('redacts command payload arguments after -- in displayed command lines', async () => {
    const runner = buildRunner([
      {
        exitCode: 0,
        stdout: JSON.stringify([
          {
            name: 'proxy',
            enabled: false,
            transport: {
              type: 'stdio',
              command: 'node',
              args: [
                'scripts/proxy.mjs',
                '-p',
                'super-secret-password',
                'https://user:pass@example.com/private',
                '--api-key',
                'ctx7-secret'
              ]
            }
          }
        ]),
        stderr: ''
      }
    ]);

    const result = await runMcpEnable(baseOptions({ commandRunner: runner }));
    const commandLine = result.actions[0]?.command_line ?? '';
    expect(commandLine).toContain('scripts/proxy.mjs');
    expect(commandLine).toContain('<redacted>');
    expect(commandLine).not.toContain('super-secret-password');
    expect(commandLine).not.toContain('user:pass@example.com');
    expect(commandLine).not.toContain('ctx7-secret');
  });

  it('marks streamable_http header-based configs as unsupported', async () => {
    const runner = buildRunner([
      {
        exitCode: 0,
        stdout: JSON.stringify([
          {
            name: 'custom-http',
            enabled: false,
            transport: {
              type: 'streamable_http',
              url: 'https://mcp.example.com/custom',
              http_headers: { Authorization: 'token' }
            }
          }
        ]),
        stderr: ''
      }
    ]);

    const result = await runMcpEnable(baseOptions({ commandRunner: runner }));

    expect(result.actions).toEqual([
      expect.objectContaining({
        name: 'custom-http',
        status: 'unsupported',
        reason: expect.stringContaining('headers/env_http_headers')
      })
    ]);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('marks servers with timeout metadata as unsupported to avoid dropping fields', async () => {
    const runner = buildRunner([
      {
        exitCode: 0,
        stdout: JSON.stringify([
          {
            name: 'delegation',
            enabled: false,
            startup_timeout_sec: 30,
            transport: {
              type: 'stdio',
              command: 'node',
              args: ['scripts/delegation-server.mjs']
            }
          }
        ]),
        stderr: ''
      }
    ]);

    const result = await runMcpEnable(baseOptions({ commandRunner: runner }));

    expect(result.actions).toEqual([
      expect.objectContaining({
        name: 'delegation',
        status: 'unsupported',
        reason: expect.stringContaining('startup/tool timeout settings')
      })
    ]);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('throws when codex mcp list fails', async () => {
    const runner = buildRunner([{ exitCode: 1, stdout: '', stderr: 'boom' }]);
    await expect(runMcpEnable(baseOptions({ commandRunner: runner }))).rejects.toThrow(
      'codex mcp list failed: boom'
    );
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('throws when codex mcp list returns invalid JSON payload', async () => {
    const runner = buildRunner([{ exitCode: 0, stdout: '{not json', stderr: '' }]);
    await expect(runMcpEnable(baseOptions({ commandRunner: runner }))).rejects.toThrow(
      'codex mcp list --json returned invalid output: invalid JSON payload.'
    );
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('throws when codex mcp list returns non-array JSON payload', async () => {
    const runner = buildRunner([{ exitCode: 0, stdout: JSON.stringify({ name: 'delegation' }), stderr: '' }]);
    await expect(runMcpEnable(baseOptions({ commandRunner: runner }))).rejects.toThrow(
      'codex mcp list --json returned invalid output: expected top-level JSON array.'
    );
    expect(runner).toHaveBeenCalledTimes(1);
  });
});
