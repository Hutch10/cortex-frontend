import { registerPlugin } from '@capacitor/core';

export interface CreateSecureRecordOptions {
  recordId: string;
  payload: string;
  createdAt: string;
  payloadHash: string;
}

export interface AppendAddendumOptions {
  recordId: string;
  addendumId: string;
  payload: string;
  createdAt: string;
  canonicalRecordHash: string;
  addendumHash: string;
}

export interface ReadSecureRecordOptions {
  storageKey: string;
}

export interface SecureStoragePlugin {
  isAvailable(): Promise<{ available: boolean }>;
  createSecureRecord(options: CreateSecureRecordOptions): Promise<{ success: boolean }>;
  appendAddendum(options: AppendAddendumOptions): Promise<{ success: boolean }>;
  readSecureRecord(options: ReadSecureRecordOptions): Promise<{ value: string | null }>;
}

const NativeVitalicastSecureStorage = registerPlugin<SecureStoragePlugin>('VitalicastSecureStorage');

const isWeb = typeof window !== 'undefined' && !((window as any).Capacitor && (window as any).Capacitor.isNative);

// Browser fallback labeled DEV_NON_AUTHORITATIVE_FALLBACK that does not claim production compliance.
class WebSecureStorageFallback implements SecureStoragePlugin {
  async isAvailable() {
    console.warn("DEV_NON_AUTHORITATIVE_FALLBACK: Vitalicast secure storage is running in a browser environment. This does not claim production secure-storage compliance.");
    return { available: true };
  }

  async createSecureRecord(options: CreateSecureRecordOptions) {
    console.warn("DEV_NON_AUTHORITATIVE_FALLBACK: createSecureRecord called");
    if (!options.payloadHash || !options.createdAt) {
      throw new Error("Missing payloadHash or createdAt");
    }
    const key = `vitalicast_canonical_${options.recordId}`;
    if (localStorage.getItem(key)) {
      throw new Error("MUTATION_REJECTED");
    }
    localStorage.setItem(key, options.payload);
    return { success: true };
  }

  async appendAddendum(options: AppendAddendumOptions) {
    console.warn("DEV_NON_AUTHORITATIVE_FALLBACK: appendAddendum called");
    if (!options.addendumHash || !options.createdAt || !options.canonicalRecordHash) {
      throw new Error("Missing required hash or createdAt");
    }
    const key = `vitalicast_addendum_${options.recordId}_${options.addendumId}`;
    if (localStorage.getItem(key)) {
      throw new Error("MUTATION_REJECTED");
    }
    localStorage.setItem(key, options.payload);
    return { success: true };
  }

  async readSecureRecord(options: ReadSecureRecordOptions) {
    console.warn("DEV_NON_AUTHORITATIVE_FALLBACK: readSecureRecord called");
    if (!options.storageKey.startsWith('vitalicast_canonical_') && !options.storageKey.startsWith('vitalicast_addendum_')) {
      throw new Error("Invalid storageKey prefix");
    }
    const val = localStorage.getItem(options.storageKey);
    return { value: val };
  }
}

export const VitalicastSecureStorage: SecureStoragePlugin = isWeb 
  ? new WebSecureStorageFallback() 
  : NativeVitalicastSecureStorage;
