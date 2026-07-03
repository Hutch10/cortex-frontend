import React from 'react';
import { componentRegistry } from '../../../core/module-registry';

export default function DynamicModulePage({ params }: { params: { module: string, view: string } }) {
  const { module, view } = params;

  const ViewComponent = componentRegistry[module]?.[view];

  if (!ViewComponent) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>404 - Module or View Not Found</h2>
        <p>Could not resolve view <strong>{view}</strong> for module <strong>{module}</strong>.</p>
      </div>
    );
  }

  return <ViewComponent />;
}
