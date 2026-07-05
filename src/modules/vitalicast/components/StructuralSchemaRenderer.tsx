import React from "react";
import { PayloadClassification } from "../core/schema/PayloadClassifier";
import { RawPayloadViewer } from "./RawPayloadViewer";
import { certifyPayloadCompatibility } from "../core/schema/SchemaCompatibilityRegistry";

export interface StructuralSchemaRendererProps {
  classification: PayloadClassification;
  rawPayload: string;
}

const JsonNodeRenderer: React.FC<{ data: any; name: string; depth: number }> = ({ data, name, depth }) => {
  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  const isArray = Array.isArray(data);

  if (isObject || isArray) {
    const keys = Object.keys(data);
    return (
      <details style={{ marginLeft: depth > 0 ? "1rem" : "0" }} className="structural-group">
        <summary>
          <strong>{name}</strong>: {isArray ? '[Array]' : '{Object}'}
        </summary>
        <div className="structural-group-children">
          {keys.map((k) => (
            <JsonNodeRenderer key={k} name={k} data={data[k]} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }

  // Primitive
  return (
    <div style={{ marginLeft: depth > 0 ? "1rem" : "0" }} className="structural-field">
      <strong>{name}</strong>: <span>{String(data)}</span>
    </div>
  );
};

export const StructuralSchemaRenderer: React.FC<StructuralSchemaRendererProps> = ({ classification, rawPayload }) => {
  if (classification === 'structurally_unknown_payload' || classification === 'malformed_payload') {
    return (
      <div className="structural-schema-container">
        <div className="text-gray-600 italic mb-2">Structural presentation is not available for this archived payload. The archived payload remains available for read-only inspection.</div>
        <RawPayloadViewer payload={rawPayload} />
      </div>
    );
  }

  const match = certifyPayloadCompatibility(rawPayload);
  if (!match) {
    return (
      <div className="structural-schema-container">
        <div className="text-gray-600 italic mb-2">Structural presentation is not available for this archived payload. The archived payload remains available for read-only inspection.</div>
        <RawPayloadViewer payload={rawPayload} />
      </div>
    );
  }

  const payload = match.payload;
  const certifiedKeys = ['domain', 'type', 'timestamp', 'samples'];
  const knownFields: Record<string, any> = {};
  const unknownFields: Record<string, any> = {};

  Object.keys(payload).forEach(key => {
    if (certifiedKeys.includes(key)) {
      knownFields[key] = payload[key];
    } else {
      unknownFields[key] = payload[key];
    }
  });

  const unknownKeys = Object.keys(unknownFields);
  const hasUnknownFields = unknownKeys.length > 0;

  return (
    <div className="structural-schema-container p-4 bg-white shadow rounded">
      <div className="text-xs text-gray-500 mb-4 italic">
        Presented from the original archived payload. No archived values were changed.
      </div>
      
      <div className="known-fields mb-6">
        <h3 className="font-semibold text-lg border-b pb-2 mb-2">Certified Structural Data</h3>
        {Object.keys(knownFields).map((key) => (
          <div key={key} className="mb-2">
            <span className="font-medium text-gray-700">{key}: </span>
            <span className="text-gray-900">{typeof knownFields[key] === 'object' ? JSON.stringify(knownFields[key]) : String(knownFields[key])}</span>
          </div>
        ))}
      </div>

      {hasUnknownFields && (
        <div className="unknown-fields-section border-t pt-4">
          <h4 className="font-semibold text-md text-gray-800">Additional archived fields</h4>
          <div className="text-sm text-gray-600 mb-2">{unknownKeys.length} fields preserved</div>
          <details className="bg-gray-50 p-2 rounded border">
            <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
              Inspect archived fields
            </summary>
            <div className="mt-2 text-sm font-mono text-gray-800">
              {unknownKeys.map(k => (
                <JsonNodeRenderer key={k} name={k} data={unknownFields[k]} depth={0} />
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
