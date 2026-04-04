/* eslint-disable patterns/prefer-logger-over-console */

import { fetchUiDataset, resolveAttachTarget, runCoStatusAttachCliShell } from './coStatusAttachCliShell.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';

export interface RunCoStatusCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

export async function runCoStatusCliShell(params: RunCoStatusCliShellParams): Promise<void> {
  if (params.flags.help !== undefined) {
    params.printHelp();
    return;
  }

  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  if (format !== 'json') {
    await runCoStatusAttachCliShell(params);
    return;
  }

  const target = await resolveAttachTarget(params.flags);
  const dataset = await fetchUiDataset(target.baseUrl, target.token);
  console.log(JSON.stringify(dataset, null, 2));
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
