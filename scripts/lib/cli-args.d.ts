export interface ParsedArgsEntry {
  key: string;
  value: string | boolean;
}

export interface ParsedArgsResult {
  args: Record<string, string | boolean>;
  positionals: string[];
  entries: ParsedArgsEntry[];
}

export function parseArgs(argv: string[]): ParsedArgsResult;
export function hasFlag(args: Record<string, string | boolean>, key: string): boolean;
