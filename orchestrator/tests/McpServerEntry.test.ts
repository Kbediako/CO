import { describe, expect, it } from 'vitest';

import { hasMcpServerEntry } from '../src/cli/utils/mcpServerEntry.js';

describe('hasMcpServerEntry', () => {
  it('detects direct server tables', () => {
    const raw = ['[mcp_servers.delegation]', 'command = "codex-orchestrator"'].join('\n');
    expect(hasMcpServerEntry(raw, 'delegation')).toBe(true);
  });

  it('detects quoted dotted entries and ignores comments', () => {
    const raw = [
      '# [mcp_servers.delegation]',
      'mcp_servers."delegation" = { enabled = true } # inline comment',
      'mcp_servers.other.enabled = false'
    ].join('\n');
    expect(hasMcpServerEntry(raw, 'delegation')).toBe(true);
  });

  it('detects single-quoted entries inside the mcp_servers table', () => {
    const raw = ['[mcp_servers]', "'delegation' = { command = \"codex-orchestrator\" }"].join('\n');
    expect(hasMcpServerEntry(raw, 'delegation')).toBe(true);
  });

  it('does not match similarly named servers', () => {
    const raw = ['[mcp_servers]', 'delegation-extra = { command = "codex-orchestrator" }'].join('\n');
    expect(hasMcpServerEntry(raw, 'delegation')).toBe(false);
  });
});
