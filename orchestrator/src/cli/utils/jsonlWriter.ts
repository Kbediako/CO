import type { JsonlEvent } from '../../../../packages/shared/events/types.js';

export class JsonlWriter {
  constructor(private readonly stream: NodeJS.WritableStream = process.stdout) {}

  write(event: JsonlEvent): void {
    const payload = `${JSON.stringify(event)}\n`;
    this.stream.write(payload);
  }
}
