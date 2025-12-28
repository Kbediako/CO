import process from 'node:process';

import { loadPackageInfo } from './utils/packageInfo.js';

export interface SelfCheckResult {
  status: 'ok';
  name: string;
  version: string;
  node: string;
  timestamp: string;
}

export function buildSelfCheckResult(): SelfCheckResult {
  const pkg = loadPackageInfo();
  return {
    status: 'ok',
    name: pkg.name ?? 'unknown',
    version: pkg.version ?? 'unknown',
    node: process.version,
    timestamp: new Date().toISOString()
  };
}
