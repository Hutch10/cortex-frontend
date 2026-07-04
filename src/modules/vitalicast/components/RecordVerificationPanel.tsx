import React, { useState, useEffect } from 'react';
import { RecordIntegrityVerifier } from '../core/inspector/RecordIntegrityVerifier';
import { RecordVerificationResult } from '../core/inspector/types';

interface RecordVerificationPanelProps {
  storageKey: string;
  verifier?: { verifyRecordIntegrity(storageKey: string): Promise<RecordVerificationResult> };
}

export const RecordVerificationPanel: React.FC<RecordVerificationPanelProps> = ({
  storageKey,
  verifier = new RecordIntegrityVerifier(),
}) => {
  const [result, setResult] = useState<RecordVerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(false);

  // Clear result if storageKey changes
  useEffect(() => {
    setResult(null);
    setDetailsExpanded(false);
  }, [storageKey]);

  const handleVerify = async () => {
    setLoading(true);
    setResult(null);
    setDetailsExpanded(false);
    try {
      const res = await verifier.verifyRecordIntegrity(storageKey);
      setResult(res);
    } catch (e) {
      // In case the verifier throws entirely outside its contract
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Structure Intact';
      case 'mismatch':
        return 'Structural Mismatch Detected';
      case 'malformed':
        return 'Format Unreadable';
      case 'unsupported':
        return 'Verification Unavailable on this Platform';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mismatch':
      case 'malformed':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'unsupported':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white max-w-2xl">
      <div className="mb-4 text-sm text-gray-600">
        This check strictly measures local storage format consistency. It does not monitor or infer health trends.
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleVerify}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Record Structure'}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded border ${getStatusColor(result.verificationStatus)}`}>
          <h3 className="font-semibold text-lg mb-2">
            {getStatusLabel(result.verificationStatus)}
          </h3>

          <div className="mt-4">
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="text-sm font-medium underline opacity-80 hover:opacity-100"
            >
              {detailsExpanded ? 'Hide Technical Log Overview' : 'Technical Log Overview'}
            </button>
            
            {detailsExpanded && (
              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-sm font-mono">
                {result.findings.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {result.findings.map((f, idx) => (
                      <li key={idx} className="mb-1">
                        <strong>{f.code}</strong>: {f.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No anomalous findings reported.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
