import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  NativeSecureKeyListProvider, 
  BrowserFallbackKeyListProvider, 
  createArchiveKeyListProvider 
} from './ArchiveKeyListProvider';
import { Capacitor } from '@capacitor/core';
import { VitalicastSecureStorage } from '../bridge/SecureStorageBridge';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  }
}));

vi.mock('../bridge/SecureStorageBridge', () => ({
  VitalicastSecureStorage: {
    listArchiveStorageKeys: vi.fn()
  }
}));

describe('ArchiveKeyListProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NativeSecureKeyListProvider', () => {
    it('returns native_authoritative on successful native enumeration', async () => {
      (VitalicastSecureStorage.listArchiveStorageKeys as any).mockResolvedValue({
        keys: ['vitalicast_canonical_123', 'vitalicast_addendum_456']
      });

      const provider = new NativeSecureKeyListProvider();
      const result = await provider.listAvailableArchiveKeys();
      
      expect(result.platformAuthority).toBe('native_authoritative');
      expect(result.rawPayloadReturned).toBe(false);
      expect(result.records.length).toBe(2);
      expect(result.records[0]).toEqual({ storageKey: 'vitalicast_canonical_123', kind: 'canonical', label: 'vitalicast_canonical_123' });
      expect(result.records[1]).toEqual({ storageKey: 'vitalicast_addendum_456', kind: 'addendum', label: 'vitalicast_addendum_456' });
      expect(result.findings).toContain('native_authoritative_archive_identity_enumeration');
      expect(result.findings).not.toContain('complete'); // Ensure no complete claims
    });

    it('returns unsupported on native list rejection', async () => {
      (VitalicastSecureStorage.listArchiveStorageKeys as any).mockRejectedValue(new Error('Native error'));

      const provider = new NativeSecureKeyListProvider();
      const result = await provider.listAvailableArchiveKeys();
      
      expect(result.platformAuthority).toBe('unsupported');
      expect(result.records.length).toBe(0);
      expect(result.findings).toContain('native_error');
    });
  });

  describe('BrowserFallbackKeyListProvider', () => {
    let mockLocalStorage: any;

    beforeEach(() => {
      mockLocalStorage = {
        length: 0,
        key: vi.fn(),
        getItem: vi.fn(),
      };
      vi.stubGlobal('localStorage', mockLocalStorage);
    });

    it('returns dev_non_authoritative_fallback and lists correct keys without reading payloads', async () => {
      mockLocalStorage.length = 3;
      mockLocalStorage.key.mockImplementation((i: number) => {
        if (i === 0) return 'vitalicast_canonical_123';
        if (i === 1) return 'vitalicast_addendum_456';
        if (i === 2) return 'some_other_key';
        return null;
      });

      const provider = new BrowserFallbackKeyListProvider();
      const result = await provider.listAvailableArchiveKeys();

      expect(result.platformAuthority).toBe('dev_non_authoritative_fallback');
      expect(result.records.length).toBe(2);
      expect(result.rawPayloadReturned).toBe(false);
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('createArchiveKeyListProvider factory', () => {
    it('returns Native provider on native platform', () => {
      (Capacitor.isNativePlatform as any).mockReturnValue(true);
      const provider = createArchiveKeyListProvider();
      expect(provider).toBeInstanceOf(NativeSecureKeyListProvider);
    });

    it('returns Browser fallback on web platform', () => {
      (Capacitor.isNativePlatform as any).mockReturnValue(false);
      const provider = createArchiveKeyListProvider();
      expect(provider).toBeInstanceOf(BrowserFallbackKeyListProvider);
    });
  });
});
