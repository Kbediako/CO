import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function ensureDir(dir: string) {
  await fs.mkdirp(dir);
}

export function logStep(label: string) {
  console.log(chalk.bold.cyan(`\n▶ ${label}`));
}

export function sanitizeFilename(input: string) {
  return input.replace(/[^a-z0-9\-_.]/gi, '_');
}

export async function saveText(filePath: string, text: string) {
  await fs.mkdirp(path.dirname(filePath));
  await fs.writeFile(filePath, text, 'utf8');
}

export async function saveBuffer(filePath: string, buf: Buffer) {
  await fs.mkdirp(path.dirname(filePath));
  await fs.writeFile(filePath, buf);
}
