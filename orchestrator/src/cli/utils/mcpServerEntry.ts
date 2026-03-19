export function hasMcpServerEntry(raw: string, serverName: string): boolean {
  const lines = raw.split('\n');
  let currentTable: string | null = null;
  const escapedServerName = escapeRegExp(serverName);

  for (const line of lines) {
    const trimmed = stripTomlComment(line).trim();
    if (!trimmed) {
      continue;
    }
    const tableMatch = trimmed.match(/^\[(.+)\]$/u);
    if (tableMatch) {
      currentTable = tableMatch[1]?.trim() ?? null;
      if (
        currentTable === `mcp_servers.${serverName}` ||
        currentTable === `mcp_servers."${serverName}"` ||
        currentTable === `mcp_servers.'${serverName}'`
      ) {
        return true;
      }
      continue;
    }

    if (trimmed.startsWith('mcp_servers.')) {
      if (trimmed.startsWith(`mcp_servers."${serverName}".`)) {
        return true;
      }
      if (trimmed.startsWith(`mcp_servers.'${serverName}'.`)) {
        return true;
      }
      if (trimmed.startsWith(`mcp_servers.${serverName}.`)) {
        return true;
      }
      const dottedEntryPattern = new RegExp(
        `^mcp_servers\\.(?:"${escapedServerName}"|'${escapedServerName}'|${escapedServerName})\\s*=`,
        'u'
      );
      if (dottedEntryPattern.test(trimmed)) {
        return true;
      }
    }

    if (currentTable === 'mcp_servers') {
      const entryPattern = new RegExp(`^(?:"${escapedServerName}"|'${escapedServerName}'|${escapedServerName})\\s*=`, 'u');
      if (entryPattern.test(trimmed)) {
        return true;
      }
    }
  }

  return false;
}

function stripTomlComment(line: string): string {
  const index = line.indexOf('#');
  if (index === -1) {
    return line;
  }
  return line.slice(0, index);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
