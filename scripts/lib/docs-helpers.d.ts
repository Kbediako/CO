export function toPosixPath(value: string): string;
export function collectMarkdownFiles(repoRoot: string, relativeDir: string): Promise<string[]>;
export function collectDocFiles(repoRoot: string): Promise<string[]>;
export function normalizeTaskKey(
  item:
    | {
        id?: string;
        slug?: string;
      }
    | null
    | undefined
): string | null;
export function parseDateString(value: string | null | undefined): string | null;
export function parseIsoDate(value: string | null | undefined): Date | null;
export function computeAgeInDays(from: Date, to: Date): number;
