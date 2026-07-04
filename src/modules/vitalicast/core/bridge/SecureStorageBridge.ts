import { registerPlugin } from '@capacitor/core';
import { EnumerateArchiveKeysOptions, EnumerateArchiveKeysResult } from '../inspector/types';

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
  enumerateArchiveKeys(options: EnumerateArchiveKeysOptions): Promise<EnumerateArchiveKeysResult>;
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

  async enumerateArchiveKeys(options: EnumerateArchiveKeysOptions): Promise<EnumerateArchiveKeysResult> {
    console.warn("DEV_NON_AUTHORITATIVE_FALLBACK: enumerateArchiveKeys called");
    const allowedNamespaces = ["vitalicast_canonical_", "vitalicast_addendum_"];
    if (!allowedNamespaces.includes(options.targetNamespace)) {
      throw new Error("Invalid namespace");
    }

    const storageKeys: string[] = [];
    const maxKeys = 1000;
    let truncated = false;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(options.targetNamespace)) {
        if (storageKeys.length >= maxKeys) {
          truncated = true;
          break;
        }
        storageKeys.push(key);
      }
    }

    return {
      storageKeys,
      targetNamespace: options.targetNamespace,
      enumerationStatus: "dev_fallback_active",
      truncated
    };
  }
}

export const VitalicastSecureStorage: SecureStoragePlugin = isWeb 
  ? new WebSecureStorageFallback() 
  : NativeVitalicastSecureStorage;
