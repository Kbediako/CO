type IdentifierKind = 'task' | 'run';
const WINDOWS_FORBIDDEN_CHARACTERS = new Set(['<', '>', ':', '"', '|', '?', '*']);
const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
  'CONIN$',
  'CONOUT$'
]);

function isWindowsReservedDeviceName(value: string): boolean {
  const baseName = value.split('.')[0]?.trimEnd();
  if (!baseName) {
    return false;
  }
  return WINDOWS_RESERVED_DEVICE_NAMES.has(baseName.toUpperCase());
}

export function sanitizeIdentifier(kind: IdentifierKind, value: string): string {
  const label = kind === 'task' ? 'task' : 'run';
  if (!value) {
    throw new Error(`Invalid ${label} ID: value must be a non-empty string.`);
  }

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
      throw new Error(`Invalid ${label} ID "${value}": control characters are not allowed.`);
    }
    if (WINDOWS_FORBIDDEN_CHARACTERS.has(char)) {
      throw new Error(`Invalid ${label} ID "${value}": character "${char}" is not allowed.`);
    }
  }

  if (value.startsWith('.')) {
    throw new Error(`Invalid ${label} ID "${value}": leading dots are not allowed.`);
  }

  if (value === '..') {
    throw new Error(`Invalid ${label} ID "${value}": traversal sequences are not allowed.`);
  }

  if (value.includes('/') || value.includes('\\')) {
    throw new Error(`Invalid ${label} ID "${value}": slashes are not allowed.`);
  }

  if (value.endsWith('.') || value.endsWith(' ')) {
    throw new Error(`Invalid ${label} ID "${value}": trailing dots or spaces are not allowed.`);
  }

  if (isWindowsReservedDeviceName(value)) {
    throw new Error(
      `Invalid ${label} ID "${value}": Windows reserved device names are not allowed.`
    );
  }

  return value;
}
