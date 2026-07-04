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

    let authoritativeRecordCount = 0;
    let fallbackRecordCount = 0;
    let addendumCount = 0;
    let truncated = false;
    let enumerationStatus = isWeb ? "dev_fallback_active" : "native_keychain";
    const unsupportedChecks: any[] = [];
    
    try {
      const canonicalRes = await VitalicastSecureStorage.enumerateArchiveKeys({ targetNamespace: "vitalicast_canonical_" });
      const addendumRes = await VitalicastSecureStorage.enumerateArchiveKeys({ targetNamespace: "vitalicast_addendum_" });
      
      if (canonicalRes.enumerationStatus === "native_keychain") {
        authoritativeRecordCount = canonicalRes.storageKeys.length;
      } else {
        fallbackRecordCount = canonicalRes.storageKeys.length;
      }
      addendumCount = addendumRes.storageKeys.length;
      truncated = canonicalRes.truncated || addendumRes.truncated;
      enumerationStatus = canonicalRes.enumerationStatus;
    } catch (e) {
      unsupportedChecks.push({
        checkName: "secure_storage_key_enumeration_unavailable",
        reason: "SecureStorageBridge readSecureRecord requires exact keys; enumeration is not exposed."
      });
    }

    let status: "healthy" | "warning" | "failed" = "warning";
    if (unsupportedChecks.length === 0) {
      if (enumerationStatus === "native_keychain" && !truncated) {
        status = "healthy";
      } else {
        status = "warning";
      }
    }

    return {
      status,
      authoritativeRecordCount,
      fallbackRecordCount,
      addendumCount,
      missingFieldFindings: [],
      hashMismatchFindings: [],
      linkageFindings: [],
      unsupportedChecks,
      scannedAt: new Date().toISOString(),
      isAuthoritativeEnvironment: !isWeb
    };
  }
}
