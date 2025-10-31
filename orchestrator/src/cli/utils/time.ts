export function isoTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function timestampForRunId(date = new Date()): string {
  return isoTimestamp(date).replace(/[:.]/g, '-');
}
