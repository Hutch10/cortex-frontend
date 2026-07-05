import React, { useState, useEffect } from 'react';
import { RecordDetailVerificationSection } from './RecordDetailVerificationSection';
import { VitalicastSecureStorage } from '../core/bridge/SecureStorageBridge';
import { RawPayloadViewer } from './RawPayloadViewer';
import { classifyPayload, PayloadClassification } from '../core/schema/PayloadClassifier';
import { StructuralSchemaRenderer } from './StructuralSchemaRenderer';

interface RecordDetailShellProps {
  storageKey: string | null;
  displayLabel?: string;
  storage?: { readSecureRecord(options: { storageKey: string }): Promise<{ value: string | null }> };
}

export const RecordDetailShell: React.FC<RecordDetailShellProps> = ({
  storageKey,
  displayLabel,
  storage = VitalicastSecureStorage
}) => {
  const [loading, setLoading] = useState(false);
  const [recordContext, setRecordContext] = useState<any>(null);
  const [rawPayload, setRawPayload] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [classification, setClassification] = useState<PayloadClassification | null>(null);

  const isValidKey = (key: string | null): boolean => {
    return typeof key === 'string' && 
      (key.startsWith('vitalicast_canonical_') || key.startsWith('vitalicast_addendum_'));
  };

  useEffect(() => {
    let isCancelled = false;

    // Reset local state immediately on key change
    setRecordContext(null);
    setRawPayload(null);
    setErrorMsg(null);
    setClassification(null);
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
            setRawPayload(response.value);
            setClassification(classifyPayload(response.value));
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

  const renderPresentationLayer = () => {
    if (!classification || !rawPayload) return null;

    if (classification.state === 'supported_structured_record' || classification.state === 'supported_structured_addendum') {
      return <StructuralSchemaRenderer classification={classification} rawPayload={rawPayload} />;
    }

    if (classification.state === 'structurally_unknown_payload' || classification.state === 'malformed_payload') {
      return (
        <div className="structural-schema-container">
          <div className="text-gray-600 italic mb-2">Unsupported structural presentation state.</div>
          <RawPayloadViewer payload={rawPayload} />
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="p-4 bg-white border rounded shadow-sm max-w-2xl flex flex-col h-full">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Record Detail Shell</h2>
      
      <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded border border-gray-200">
        <p><strong>Context:</strong> {displayLabel || 'Unknown Record'}</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="p-4 text-gray-500">Loading envelope context...</div>
        ) : errorMsg ? (
          <div className="p-4 text-amber-700 bg-amber-50 rounded border border-amber-200" data-testid="error-message">
            {errorMsg}
          </div>
        ) : recordContext ? (
          <>
            <div className="mb-4 text-sm text-gray-700">
              Record envelope loaded. 
            </div>
            
            {renderPresentationLayer()}
          </>
        ) : null}

        {/* Verification section strictly gated by record presence context */}
        {recordContext && !loading && !errorMsg && (
          <div className="mt-6 border-t pt-4">
            <RecordDetailVerificationSection storageKey={storageKey} />
          </div>
        )}
      </div>
    </div>
  );
};
