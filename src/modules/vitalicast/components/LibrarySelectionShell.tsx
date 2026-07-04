import React, { useState } from 'react';
import { RecordDetailShell } from './RecordDetailShell';

export interface LibraryRow {
  id: string;
  label: string;
  storageKey: string;
  kind?: "canonical" | "addendum";
}

interface LibrarySelectionShellProps {
  rows?: LibraryRow[];
  DetailComponent?: React.ComponentType<{ storageKey: string }>;
}

const DEFAULT_STUB_ROWS: LibraryRow[] = [
  { id: '1', label: 'Sample Record A', storageKey: 'vitalicast_canonical_111', kind: 'canonical' },
  { id: '2', label: 'Sample Record B', storageKey: 'vitalicast_canonical_222', kind: 'canonical' },
  { id: '3', label: 'Sample Addendum', storageKey: 'vitalicast_addendum_333', kind: 'addendum' }
];

export const LibrarySelectionShell: React.FC<LibrarySelectionShellProps> = ({
  rows = DEFAULT_STUB_ROWS,
  DetailComponent = RecordDetailShell
}) => {
  const [selectedStorageKey, setSelectedStorageKey] = useState<string | null>(null);

  const handleSelect = (key: string) => {
    setSelectedStorageKey(key);
  };

  const handleClose = () => {
    setSelectedStorageKey(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4">
      {/* List View */}
      <div className="w-full md:w-1/3 border rounded shadow-sm bg-white overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 bg-gray-50 border-b font-semibold text-gray-800">
          Library Stub
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {rows.map(row => (
            <button
              key={row.id}
              onClick={() => handleSelect(row.storageKey)}
              className={`w-full text-left p-3 mb-2 rounded border focus:outline-none transition-colors ${
                selectedStorageKey === row.storageKey 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-800">{row.label}</div>
              <div className="text-xs text-gray-500 mt-1 capitalize">{row.kind || 'Unknown Kind'}</div>
            </button>
          ))}
          {rows.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No records available.
            </div>
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className="w-full md:w-2/3 border rounded shadow-sm bg-white h-[600px] overflow-y-auto">
        {selectedStorageKey ? (
          <div className="flex flex-col h-full">
            <div className="p-2 border-b bg-gray-50 flex justify-end">
              <button 
                onClick={handleClose}
                className="text-sm px-3 py-1 bg-white border rounded hover:bg-gray-100 focus:outline-none"
              >
                Close Details
              </button>
            </div>
            <div className="p-4 flex-1">
              <DetailComponent storageKey={selectedStorageKey} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a record to view details.
          </div>
        )}
      </div>
    </div>
  );
};
