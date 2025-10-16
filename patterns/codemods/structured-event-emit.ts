import type { API, CallExpression, FileInfo, MemberExpression } from 'jscodeshift';

function isEventBusTarget(target: MemberExpression['object']): boolean {
  if (target.type === 'Identifier') {
    return target.name === 'eventBus';
  }
  if (target.type === 'MemberExpression') {
    if (target.property.type === 'Identifier' && target.property.name === 'eventBus') {
      return true;
    }
    if (target.object.type === 'Identifier' && target.object.name === 'eventBus') {
      return true;
    }
  }
  return false;
}

function isEmitCall(node: CallExpression): boolean {
  if (node.callee.type !== 'MemberExpression') {
    return false;
  }
  const member = node.callee as MemberExpression;
  return (
    member.property.type === 'Identifier' &&
    member.property.name === 'emit' &&
    isEventBusTarget(member.object)
  );
}

function isSpread(expr: unknown): boolean {
  return typeof expr === 'object' && expr !== null && (expr as { type?: string }).type === 'SpreadElement';
}

export default function transformer(file: FileInfo, api: API): string {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.CallExpression)
    .filter((path) => isEmitCall(path.node))
    .forEach((path) => {
      const args = path.node.arguments;
      if (args.length !== 2) {
        return;
      }
      const [eventArg, payloadArg] = args;
      if (eventArg.type !== 'Literal' || typeof eventArg.value !== 'string') {
        return;
      }
      if (!payloadArg || isSpread(payloadArg)) {
        return;
      }

      const payload = payloadArg as any;

      const objectArg = j.objectExpression([
        j.property('init', j.identifier('type'), j.literal(eventArg.value)),
        j.property('init', j.identifier('payload'), payload)
      ]);

      path.node.arguments = [objectArg];
    });

  return root.toSource({ quote: 'single' });
}
