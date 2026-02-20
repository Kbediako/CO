const SAFE_COMMAND_PREVIEW_TOKEN = /^[A-Za-z0-9_./:@=-]+$/u;

export function quoteCommandPreviewToken(value: string): string {
  if (SAFE_COMMAND_PREVIEW_TOKEN.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildCommandPreview(command: string, args: string[]): string {
  return [quoteCommandPreviewToken(command), ...args.map((arg) => quoteCommandPreviewToken(arg))].join(' ');
}
