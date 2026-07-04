import React from "react";
import { StructuralFieldNode } from "../core/schema/StructuralPayloadParser";

export interface StructuralSchemaRendererProps {
  nodes: StructuralFieldNode[];
}

const NodeRenderer: React.FC<{ node: StructuralFieldNode; depth: number }> = ({ node, depth }) => {
  const isGroup = node.valueType === "object" || node.valueType === "array";

  if (isGroup) {
    return (
      <details
        style={{ marginLeft: depth > 0 ? "1rem" : "0" }}
        className="structural-group"
      >
        <summary>
          <strong>{node.key}</strong>: {node.displayValue || `[${node.valueType}]`}
          {node.isTruncated && <span className="truncation-marker"> (truncated)</span>}
        </summary>
        <div className="structural-group-children">
          {node.children?.map((child) => (
            <NodeRenderer key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }

  return (
    <div style={{ marginLeft: depth > 0 ? "1rem" : "0" }} className="structural-field">
      <strong>{node.key}</strong>: <span>{node.displayValue}</span>
      {node.isTruncated && <span className="truncation-marker"> (truncated)</span>}
    </div>
  );
};

export const StructuralSchemaRenderer: React.FC<StructuralSchemaRendererProps> = ({ nodes }) => {
  if (!nodes || nodes.length === 0) {
    return <div className="structural-schema-empty">No structural data available.</div>;
  }

  return (
    <div className="structural-schema-container">
      {nodes.map((node) => (
        <NodeRenderer key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
};
