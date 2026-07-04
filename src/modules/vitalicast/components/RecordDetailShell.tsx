import React, { useState, useEffect } from 'react';
import { RecordDetailVerificationSection } from './RecordDetailVerificationSection';
import { VitalicastSecureStorage } from '../core/bridge/SecureStorageBridge';

interface RecordDetailShellProps {
  storageKey: string | null;
  storage?: { readSecureRecord(options: { storageKey: string }): Promise<{ value: string | null }> };
}

export const RecordDetailShell: React.FC<RecordDetailShellProps> = ({
  storageKey,
  storage = VitalicastSecureStorage
}) => {
  const [loading, setLoading] = useState(false);
  const [recordContext, setRecordContext] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValidKey = (key: string | null): boolean => {
    return typeof key === 'string' && 
      (key.startsWith('vitalicast_canonical_') || key.startsWith('vitalicast_addendum_'));
  };

  useEffect(() => {
    let isCancelled = false;

    // Reset local state immediately on key change
    setRecordContext(null);
    setErrorMsg(null);
    setLoading(false);

    if (!isValidKey(storageKey) || !storageKey) {
      return;
    }

    const fetchRecord = async () => {
      setLoading(true);
      try {
        const response = await storage.readSecureRecord({ storageKey });
        if (!isCancelled) {
          if (response.value) {
            setRecordContext({ loaded: true, partialValue: true });
          } else {
            setErrorMsg('Record reference could not be resolved in local storage.');
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMsg('An error occurred accessing the local record envelope.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchRecord();

    return () => {
      isCancelled = true;
    };
  }, [storageKey, storage]);

  if (!isValidKey(storageKey) || !storageKey) {
    return (
      <div className="p-4 bg-gray-50 text-gray-700 border rounded shadow-sm max-w-2xl">
        No valid record reference selected.
      </div>
    );
  }

  const isCanonical = storageKey.startsWith('vitalicast_canonical_');
  const recordKindDisplay = isCanonical ? 'Canonical' : 'Addendum';
  
  // Mask key: vitalicast_canonical_...abcd
  const prefix = isCanonical ? 'vitalicast_canonical_' : 'vitalicast_addendum_';
  const suffix = storageKey.substring(storageKey.length - 4);
  const maskedKey = storageKey.length > prefix.length + 4 
    ? `${prefix}…${suffix}`
    : storageKey;

  return (
    <div className="p-4 bg-white border rounded shadow-sm max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Record Detail Shell</h2>
      
      <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded border border-gray-200">
        <p><strong>Context:</strong> {recordKindDisplay}</p>
        <p><strong>Reference:</strong> {maskedKey}</p>
      </div>

      {loading ? (
        <div className="p-4 text-gray-500">Loading envelope context...</div>
      ) : errorMsg ? (
        <div className="p-4 text-amber-700 bg-amber-50 rounded border border-amber-200">
          {errorMsg}
        </div>
      ) : recordContext ? (
        <div className="mb-4 text-sm text-gray-700">
          Record envelope loaded. Detailed payload display is deferred to a future audited record viewer.
        </div>
      ) : null}

      {/* Verification section strictly gated by record presence context */}
      {recordContext && !loading && !errorMsg && (
        <RecordDetailVerificationSection storageKey={storageKey} />
      )}
    </div>
  );
};
