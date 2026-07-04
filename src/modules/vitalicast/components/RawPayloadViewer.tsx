import React, { useMemo, useState } from 'react';

interface RawPayloadViewerProps {
  payload: string | null | undefined;
}

export const RawPayloadViewer: React.FC<RawPayloadViewerProps> = ({ payload }) => {
  const [expanded, setExpanded] = useState(false);

  const parsedData = useMemo(() => {
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }, [payload]);

  if (!payload) {
    return null;
  }

  return (
    <div className="mt-4 border rounded shadow-sm bg-gray-50 overflow-hidden text-sm">
      <button 
        className="w-full text-left p-3 font-medium text-gray-700 hover:bg-gray-100 focus:outline-none flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Raw Record Data</span>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="p-4 border-t border-gray-200 bg-white overflow-x-auto max-h-96">
          {parsedData !== null ? (
            <pre className="text-gray-800 text-xs font-mono">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          ) : (
            <div className="text-gray-500 italic">
              Payload parsing unavailable.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
