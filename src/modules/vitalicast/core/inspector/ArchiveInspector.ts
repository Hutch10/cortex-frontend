import { ArchiveHealthReport } from './types';
import { VitalicastSecureStorage } from '../bridge/SecureStorageBridge';

export class ArchiveInspector {
  /**
   * Scans the Vitalicast secure storage for archive health.
   * This is a strictly read-only operation.
   * Because secure_storage_key_enumeration_unavailable is true, this currently
   * returns a deterministic warning report without scanning the full archive.
   */
  async scan(): Promise<ArchiveHealthReport> {
    const isWeb = typeof window !== 'undefined' && !((window as any).Capacitor && (window as any).Capacitor.isNative);
    
    // We optionally call isAvailable, though it doesn't currently check for enumeration
    await VitalicastSecureStorage.isAvailable();

    return {
      status: "warning",
      authoritativeRecordCount: 0,
      fallbackRecordCount: 0,
      addendumCount: 0,
      missingFieldFindings: [],
      hashMismatchFindings: [],
      linkageFindings: [],
      unsupportedChecks: [
        {
          checkName: "secure_storage_key_enumeration_unavailable",
          reason: "SecureStorageBridge readSecureRecord requires exact keys; enumeration is not exposed."
        }
      ],
      scannedAt: new Date().toISOString(),
      isAuthoritativeEnvironment: !isWeb
    };
  }
}
