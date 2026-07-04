import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  NativeSecureKeyListProviderStub, 
  BrowserFallbackKeyListProvider, 
  createArchiveKeyListProvider 
} from './ArchiveKeyListProvider';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  }
}));

describe('ArchiveKeyListProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NativeSecureKeyListProviderStub', () => {
    it('returns unsupported and does not call localStorage', async () => {
      const provider = new NativeSecureKeyListProviderStub();
      const result = await provider.listAvailableArchiveKeys();
      
      expect(result.platformAuthority).toBe('unsupported');
      expect(result.records).toEqual([]);
      expect(result.findings).toContain('native_key_list_provider_unsupported_phase10');
      expect(result.rawPayloadReturned).toBe(false);
    });
  });

  describe('BrowserFallbackKeyListProvider', () => {
    let mockLocalStorage: any;

    beforeEach(() => {
      mockLocalStorage = {
        length: 0,
        key: vi.fn(),
        getItem: vi.fn(), // Should not be called
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
      expect(result.records[0]).toEqual({ storageKey: 'vitalicast_canonical_123', kind: 'canonical', label: 'vitalicast_canonical_123' });
      expect(result.records[1]).toEqual({ storageKey: 'vitalicast_addendum_456', kind: 'addendum', label: 'vitalicast_addendum_456' });
      expect(result.rawPayloadReturned).toBe(false);
      
      // Ensure we didn't call getItem
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('createArchiveKeyListProvider factory', () => {
    it('returns Native stub on native platform', () => {
      (Capacitor.isNativePlatform as any).mockReturnValue(true);
      const provider = createArchiveKeyListProvider();
      expect(provider).toBeInstanceOf(NativeSecureKeyListProviderStub);
    });

    it('returns Browser fallback on web platform', () => {
      (Capacitor.isNativePlatform as any).mockReturnValue(false);
      const provider = createArchiveKeyListProvider();
      expect(provider).toBeInstanceOf(BrowserFallbackKeyListProvider);
    });
  });
});
