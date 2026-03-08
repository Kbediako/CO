import http from 'node:http';

import { logger } from '../../logger.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { ControlRuntime } from './controlRuntime.js';

interface ControlEventTransportInput {
  event: string;
  actor: string;
  payload: Record<string, unknown>;
}

interface ControlEventTransportOptions {
  eventStream?: Pick<RunEventStream, 'append'>;
  clients: Set<http.ServerResponse>;
  runtime: Pick<ControlRuntime, 'publish'>;
}

export interface ControlEventTransport {
  emitControlEvent(input: ControlEventTransportInput): Promise<void>;
  broadcast(entry: RunEventStreamEntry): void;
}

export function createControlEventTransport(
  options: ControlEventTransportOptions
): ControlEventTransport {
  return new ControlEventTransportRuntime(options);
}

class ControlEventTransportRuntime implements ControlEventTransport {
  private readonly eventStream?: Pick<RunEventStream, 'append'>;
  private readonly clients: Set<http.ServerResponse>;
  private readonly runtime: Pick<ControlRuntime, 'publish'>;

  constructor(options: ControlEventTransportOptions) {
    this.eventStream = options.eventStream;
    this.clients = options.clients;
    this.runtime = options.runtime;
  }

  async emitControlEvent(input: ControlEventTransportInput): Promise<void> {
    if (!this.eventStream) {
      return;
    }
    let entry: RunEventStreamEntry;
    try {
      entry = await this.eventStream.append({
        event: input.event,
        actor: input.actor,
        payload: input.payload
      });
    } catch (error) {
      logger.warn(`Failed to append control event ${input.event}: ${(error as Error)?.message ?? error}`);
      return;
    }
    this.writeToClients(entry);
  }

  broadcast(entry: RunEventStreamEntry): void {
    this.writeToClients(entry);
    this.runtime.publish({
      eventSeq: entry.seq,
      source: entry.event
    });
  }

  private writeToClients(entry: RunEventStreamEntry): void {
    const payload = `data: ${JSON.stringify(entry)}\n\n`;
    for (const client of this.clients) {
      client.write(payload, (error) => {
        if (error) {
          this.clients.delete(client);
        }
      });
    }
  }
}
