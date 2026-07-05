import React, { useState } from 'react';

interface RawPayloadViewerProps {
  payload: string | null | undefined;
}

export const RawPayloadViewer: React.FC<RawPayloadViewerProps> = ({ payload }) => {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');

  if (!payload) {
    return null;
  }

  let parsed: any;
  let isMalformed = false;
  try {
    parsed = JSON.parse(payload);
  } catch (err) {
    isMalformed = true;
  }

  const renderJsonTree = (data: any, name: string, depth: number): React.ReactNode => {
    const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
    const isArray = Array.isArray(data);

    if (isObject || isArray) {
      const keys = Object.keys(data);
      return (
        <details key={name} style={{ marginLeft: depth > 0 ? "1rem" : "0" }} className="structural-group">
          <summary>
            <strong>{name}</strong>: {isArray ? '[Array]' : '{Object}'}
          </summary>
          <div className="structural-group-children">
            {keys.map((k) => renderJsonTree(data[k], k, depth + 1))}
          </div>
        </details>
      );
    }

    return (
      <div key={name} style={{ marginLeft: depth > 0 ? "1rem" : "0" }} className="structural-field">
        <strong>{name}</strong>: <span>{String(data)}</span>
      </div>
    );
  };

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
              isMalformed ? (
                <div>
                  <div className="text-gray-500 italic mb-2">Payload parsing unavailable.</div>
                </div>
              ) : (
                <div className="font-mono text-xs">
                  {renderJsonTree(parsed, 'root', 0)}
                </div>
              )
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
