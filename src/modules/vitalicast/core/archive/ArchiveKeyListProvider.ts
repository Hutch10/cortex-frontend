import { VitalicastSecureStorage } from '../bridge/SecureStorageBridge';
import { Capacitor } from '@capacitor/core';

export type PlatformAuthority =
  | "native_authoritative"
  | "dev_non_authoritative_fallback"
  | "unsupported";

export interface ArchiveKeyRecord {
  storageKey: string;
  kind: "canonical" | "addendum";
  label?: string;
}

export interface ArchiveKeyListResult {
  platformAuthority: PlatformAuthority;
  records: ArchiveKeyRecord[];
  findings: string[];
  rawPayloadReturned: false;
}

export interface ArchiveKeyListProvider {
  listAvailableArchiveKeys(): Promise<ArchiveKeyListResult>;
}

export class NativeSecureKeyListProvider implements ArchiveKeyListProvider {
  public async listAvailableArchiveKeys(): Promise<ArchiveKeyListResult> {
    try {
      const result = await VitalicastSecureStorage.listArchiveStorageKeys();
      const records: ArchiveKeyRecord[] = result.keys.map(key => ({
        storageKey: key,
        kind: key.startsWith('vitalicast_canonical_') ? 'canonical' : 'addendum'
      }));
      return {
        platformAuthority: "native_authoritative",
        records,
        findings: ["native_authoritative_archive_identity_enumeration"],
        rawPayloadReturned: false,
      };
    } catch (error) {
      return {
        platformAuthority: "unsupported",
        records: [],
        findings: ["native_key_list_provider_unsupported_phase10", "native_error"],
        rawPayloadReturned: false,
      };
    }
  }
}

export class BrowserFallbackKeyListProvider implements ArchiveKeyListProvider {
  public async listAvailableArchiveKeys(): Promise<ArchiveKeyListResult> {
    const records: ArchiveKeyRecord[] = [];
    const maxRecords = 1000;
    
    // Only available in browser, do safely
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        if (records.length >= maxRecords) break;
        const key = window.localStorage.key(i);
        if (!key) continue;

        if (key.startsWith('vitalicast_canonical_')) {
          records.push({ storageKey: key, kind: 'canonical' });
        } else if (key.startsWith('vitalicast_addendum_')) {
          records.push({ storageKey: key, kind: 'addendum' });
        }
      }
    }

    return {
      platformAuthority: "dev_non_authoritative_fallback",
      records,
      findings: ["dev_non_authoritative_fallback_used"],
      rawPayloadReturned: false,
    };
  }
}

export function createArchiveKeyListProvider(): ArchiveKeyListProvider {
  if (Capacitor.isNativePlatform()) {
    return new NativeSecureKeyListProvider();
  }
  return new BrowserFallbackKeyListProvider();
}
