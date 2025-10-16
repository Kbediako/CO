import type { API, FileInfo, ObjectExpression } from 'jscodeshift';

function hasProperty(node: ObjectExpression, name: string, j: API['jscodeshift']): boolean {
  return node.properties.some((property) => {
    if (!property || property.type !== 'Property') {
      return false;
    }
    const key = (property as any).key;
    if (j.Identifier.check(key)) {
      return key.name === name;
    }
    if (j.Literal.check(key)) {
      return key.value === name;
    }
    return false;
  });
}

export default function transformer(file: FileInfo, api: API): string {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.find(j.ObjectExpression).forEach((path) => {
    const objectExpression = path.node;
    if (!hasProperty(objectExpression, 'taskId', j)) {
      return;
    }

    if (!hasProperty(objectExpression, 'mode', j)) {
      objectExpression.properties.push(
        j.property('init', j.identifier('mode'), j.identifier('mode'))
      );
    }

    if (!hasProperty(objectExpression, 'timestamp', j)) {
      const timestampCall = j.callExpression(
        j.memberExpression(
          j.newExpression(j.identifier('Date'), []),
          j.identifier('toISOString'),
          false
        ),
        []
      );
      objectExpression.properties.push(
        j.property('init', j.identifier('timestamp'), timestampCall)
      );
    }
  });

  return root.toSource({ quote: 'single' });
}
