export type SelfCheckCliFormat = 'json' | 'text';

export interface SelfCheckCliResult {
  status: 'ok';
  name: string;
  version: string;
  node: string;
  timestamp: string;
}

export interface RunSelfCheckCliShellParams {
  format: SelfCheckCliFormat;
  buildResult: () => SelfCheckCliResult;
  log: (line: string) => void;
}

export async function runSelfCheckCliShell(params: RunSelfCheckCliShellParams): Promise<void> {
  const result = params.buildResult();
  if (params.format === 'json') {
    params.log(JSON.stringify(result, null, 2));
    return;
  }

  params.log(`Status: ${result.status}`);
  params.log(`Name: ${result.name}`);
  params.log(`Version: ${result.version}`);
  params.log(`Node: ${result.node}`);
  params.log(`Timestamp: ${result.timestamp}`);
}
