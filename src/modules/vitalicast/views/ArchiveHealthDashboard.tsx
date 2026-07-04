import React, { useState, useCallback } from 'react';
import { ArchiveInspector } from '../core/inspector/ArchiveInspector';
import { ArchiveHealthReport } from '../core/inspector/types';

export const ArchiveHealthDashboard: React.FC = () => {
  const [report, setReport] = useState<ArchiveHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runArchiveCheck = useCallback(async () => {
    setLoading(true);
    try {
      const inspector = new ArchiveInspector();
      const result = await inspector.scan();
      setReport(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Archive Health Dashboard</h2>
        <button
          onClick={runArchiveCheck}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Run Archive Check'}
        </button>
      </div>

      {report && (
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-2">Overall Status: {report.status.toUpperCase()}</h3>
            <p>Scanned At: {report.scannedAt}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-gray-100 rounded">
                <div className="text-sm text-gray-500">Authoritative Records</div>
                <div className="text-xl font-mono">{report.authoritativeRecordCount}</div>
              </div>
              <div className="p-3 bg-gray-100 rounded">
                <div className="text-sm text-gray-500">Addendum Records</div>
                <div className="text-xl font-mono">{report.addendumCount}</div>
              </div>
              <div className="p-3 bg-gray-100 rounded">
                <div className="text-sm text-gray-500">Fallback Records</div>
                <div className="text-xl font-mono">{report.fallbackRecordCount}</div>
              </div>
            </div>
          </div>

          {report.unsupportedChecks.some(c => c.checkName === 'secure_storage_key_enumeration_unavailable') && (
            <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded">
              <p className="font-semibold">Archive Key Inventory Locked Natively.</p>
              <p className="mt-1 text-sm">Key inventory enumeration is restricted by the current secure-storage policy. Individual records can still be verified on demand through exact-record reads when a record is opened.</p>
            </div>
          )}

          {(report.fallbackRecordCount > 0 || !report.isAuthoritativeEnvironment) && (
            <div className="p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded">
              <p className="text-sm">Browser fallback records are non-authoritative development records.</p>
            </div>
          )}

          {report.missingFieldFindings.length > 0 && (
            <div className="p-4 border border-red-200 rounded">
              <h4 className="font-semibold text-red-800">Missing Field Findings</h4>
              <ul className="list-disc ml-5 mt-2 text-sm text-red-700">
                {report.missingFieldFindings.map((finding, idx) => (
                  <li key={idx}>{finding.message}</li>
                ))}
              </ul>
            </div>
          )}

          {report.hashMismatchFindings.length > 0 && (
            <div className="p-4 border border-red-200 rounded">
              <h4 className="font-semibold text-red-800">Hash Mismatch Findings</h4>
              <ul className="list-disc ml-5 mt-2 text-sm text-red-700">
                {report.hashMismatchFindings.map((finding, idx) => (
                  <li key={idx}>{finding.message}</li>
                ))}
              </ul>
            </div>
          )}

          {report.linkageFindings.length > 0 && (
            <div className="p-4 border border-red-200 rounded">
              <h4 className="font-semibold text-red-800">Linkage Findings</h4>
              <ul className="list-disc ml-5 mt-2 text-sm text-red-700">
                {report.linkageFindings.map((finding, idx) => (
                  <li key={idx}>{finding.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
