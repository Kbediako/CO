import { randomBytes } from 'node:crypto';
import { timestampForRunId } from './time.js';

export function generateRunId(): string {
  const ts = timestampForRunId();
  const suffix = randomBytes(4).toString('hex');
  return `${ts}-${suffix}`;
}
