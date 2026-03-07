import http from 'node:http';

export interface EventsSseControllerContext {
  req: Pick<http.IncomingMessage, 'on'>;
  res: http.ServerResponse;
  clients: Set<http.ServerResponse>;
}

export function handleEventsSseRequest(context: EventsSseControllerContext): void {
  context.res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  context.res.write(`: ok\n\n`);
  context.clients.add(context.res);
  context.req.on('close', () => {
    context.clients.delete(context.res);
  });
}
