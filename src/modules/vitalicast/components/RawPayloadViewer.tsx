import React, { useMemo, useState } from 'react';
import { parsePayloadStructure } from '../core/schema/StructuralPayloadParser';
import { StructuralSchemaRenderer } from './StructuralSchemaRenderer';

interface RawPayloadViewerProps {
  payload: string | null | undefined;
}

export const RawPayloadViewer: React.FC<RawPayloadViewerProps> = ({ payload }) => {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');

  // Strict useMemo parsing, avoiding any persisted cache/state for parsed structures.
  const parsedNodes = useMemo(() => {
    if (!payload) return null;
    return parsePayloadStructure(payload);
  }, [payload]);

  // We need to know if it's malformed to decide how to handle the toggle view.
  // parsePayloadStructure always returns a node, but if it fails it returns exactly
  // one node with "Payload parsing unavailable."
  const isMalformed = useMemo(() => {
    if (!parsedNodes) return false;
    return parsedNodes.length === 1 && parsedNodes[0].displayValue === 'Payload parsing unavailable.';
  }, [parsedNodes]);

  if (!payload) {
    return null;
  }

  return (
    <div className="mt-4 border rounded shadow-sm bg-gray-50 overflow-hidden text-sm structural-payload-viewer">
      <button 
        className="w-full text-left p-3 font-medium text-gray-700 hover:bg-gray-100 focus:outline-none flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Raw Record Data</span>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 bg-white flex flex-col max-h-[500px]">
          {/* Neutral Toggle - only local state, no primary styling */}
          <div className="flex border-b border-gray-200 p-2 space-x-2 bg-gray-50">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 rounded text-xs focus:outline-none ${
                viewMode === 'tree' ? 'bg-gray-200 font-semibold' : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              View as Tree
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded text-xs focus:outline-none ${
                viewMode === 'raw' ? 'bg-gray-200 font-semibold' : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              View Raw JSON
            </button>
          </div>
          
          <div className="p-4 overflow-auto">
            {viewMode === 'tree' ? (
              <StructuralSchemaRenderer nodes={parsedNodes || []} />
            ) : (
              isMalformed ? (
                <div>
                  <div className="text-gray-500 italic mb-2">Payload parsing unavailable.</div>
                  <div className="text-gray-400 text-xs mb-1 uppercase font-semibold tracking-wider">Raw Stored Text (Truncated)</div>
                  <pre className="text-gray-800 text-xs font-mono whitespace-pre-wrap">
                    {payload.length > 500 ? payload.substring(0, 500) + '...' : payload}
                  </pre>
                </div>
              ) : (
                <pre className="text-gray-800 text-xs font-mono whitespace-pre-wrap">
                  {payload}
                </pre>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
