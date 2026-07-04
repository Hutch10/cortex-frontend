import React, { useState } from 'react';
import { RecordVerificationPanel } from './RecordVerificationPanel';
import { RecordVerificationResult } from '../core/inspector/types';

interface RecordDetailVerificationSectionProps {
  storageKey: string;
  verifier?: { verifyRecordIntegrity(storageKey: string): Promise<RecordVerificationResult> };
}

export const RecordDetailVerificationSection: React.FC<RecordDetailVerificationSectionProps> = ({
  storageKey,
  verifier
}) => {
  const [expanded, setExpanded] = useState(false);

  // Validate storageKey
  const isValidKey = 
    typeof storageKey === 'string' &&
    (storageKey.startsWith('vitalicast_canonical_') || storageKey.startsWith('vitalicast_addendum_'));

  return (
    <div className="mt-6 border-t pt-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="text-lg font-medium text-gray-800 hover:text-blue-600 focus:outline-none flex items-center justify-between w-full text-left"
      >
        <span>Data Integrity Details</span>
        <span>{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-gray-50 rounded shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-4">
            This section checks local record structure only. It does not evaluate physical wellness or physiological trends.
          </p>

          {!isValidKey ? (
            <div className="text-sm text-gray-800 p-3 bg-white border rounded">
              Verification is unavailable for this record reference.
            </div>
          ) : (
            <RecordVerificationPanel 
              key={storageKey} 
              storageKey={storageKey} 
              verifier={verifier} 
            />
          )}
        </div>
      )}
    </div>
  );
};
