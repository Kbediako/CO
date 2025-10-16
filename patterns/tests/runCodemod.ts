import type { API, FileInfo } from 'jscodeshift';
import jscodeshift from 'jscodeshift';

type Transform = (file: FileInfo, api: API, options?: Record<string, unknown>) => string;

export function runCodemod(
  transform: Transform,
  source: string,
  options: Record<string, unknown> = {}
): string {
  const file: FileInfo = {
    path: 'test.ts',
    source
  };

  const api = {
    jscodeshift,
    stats: () => undefined,
    report: () => undefined
  } as unknown as API;

  return transform(file, api, options);
}
