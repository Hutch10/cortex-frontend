import React, { useState, useEffect } from 'react';
import { RecordDetailShell } from './RecordDetailShell';
import { ArchiveKeyListProvider, createArchiveKeyListProvider, ArchiveKeyListResult, ArchiveKeyRecord } from '../core/archive/ArchiveKeyListProvider';

function createNeutralArchiveIdentityLabels(records: ArchiveKeyRecord[]): ArchiveKeyRecord[] {
  let canonicalCount = 0;
  let addendumCount = 0;
  return records.map(record => {
    let label = '';
    if (record.kind === 'canonical') {
      canonicalCount++;
      label = `Record ${canonicalCount}`;
    } else {
      addendumCount++;
      label = `Addendum ${addendumCount}`;
    }
    return { ...record, label };
  });
}

interface LibrarySelectionShellProps {
  provider?: ArchiveKeyListProvider;
  DetailComponent?: React.ComponentType<{ storageKey: string, displayLabel?: string }>;
}

export const LibrarySelectionShell: React.FC<LibrarySelectionShellProps> = ({
  provider = createArchiveKeyListProvider(),
  DetailComponent = RecordDetailShell
}) => {
  const [selectedRecord, setSelectedRecord] = useState<{ storageKey: string, displayLabel: string } | null>(null);
  const [providerResult, setProviderResult] = useState<ArchiveKeyListResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    const fetchKeys = async () => {
      setLoading(true);
      try {
        const result = await provider.listAvailableArchiveKeys();
        if (!isCancelled) {
          const processedRecords = createNeutralArchiveIdentityLabels(result.records);
          setProviderResult({ ...result, records: processedRecords });
        }
      } catch (err) {
        // Fallback for safety
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchKeys();
    return () => { isCancelled = true; };
  }, [provider]);

  const handleSelect = (key: string, label: string) => {
    setSelectedRecord({ storageKey: key, displayLabel: label });
  };

  const handleClose = () => {
    setSelectedRecord(null);
  };

  if (loading) {
    return <div className="p-4">Loading library context...</div>;
  }

  if (providerResult?.platformAuthority === 'unsupported') {
    return (
      <div className="p-4 border rounded shadow-sm bg-gray-50 text-gray-700 max-w-2xl">
        Archive browsing requires an audited platform list provider. Exact-record verification remains available when accessed through a direct record context.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4">
      {/* List View */}
      <div className="w-full md:w-1/3 border rounded shadow-sm bg-white overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 bg-gray-50 border-b font-semibold text-gray-800">
          Library Selection
        </div>
        
        {providerResult?.platformAuthority === 'dev_non_authoritative_fallback' && (
          <div className="p-2 bg-amber-50 text-amber-800 text-xs border-b border-amber-200">
            Development fallback list. These rows are non-authoritative and are not a production archive browser.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {providerResult?.records.map(row => (
            <button
              key={row.storageKey}
              onClick={() => handleSelect(row.storageKey, row.label || row.storageKey)}
              className={`w-full text-left p-3 mb-2 rounded border focus:outline-none transition-colors ${
                selectedRecord?.storageKey === row.storageKey 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-800 truncate">{row.label}</div>
              <div className="text-xs text-gray-500 mt-1 capitalize">{row.kind}</div>
            </button>
          ))}
          {(!providerResult?.records || providerResult.records.length === 0) && (
            <div className="p-4 text-center text-gray-500 text-sm">
              {providerResult?.platformAuthority === 'native_authoritative' 
                ? 'No archive records available.' 
                : 'No records available.'}
            </div>
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className="w-full md:w-2/3 border rounded shadow-sm bg-white h-[600px] overflow-y-auto">
        {selectedRecord ? (
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
              <DetailComponent storageKey={selectedRecord.storageKey} displayLabel={selectedRecord.displayLabel} />
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
