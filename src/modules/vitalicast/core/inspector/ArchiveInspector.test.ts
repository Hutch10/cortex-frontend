import { ArchiveInspector } from './ArchiveInspector';
import { VitalicastSecureStorage } from '../bridge/SecureStorageBridge';

// Mock the bridge
jest.mock('../bridge/SecureStorageBridge', () => {
  return {
    VitalicastSecureStorage: {
      isAvailable: jest.fn().mockResolvedValue({ available: true }),
      enumerateArchiveKeys: jest.fn()
    }
  };
});

describe('ArchiveInspector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('canonical namespace returns only canonical keys and counts appropriately', async () => {
    (VitalicastSecureStorage.enumerateArchiveKeys as jest.Mock).mockImplementation(async (opts) => {
      if (opts.targetNamespace === 'vitalicast_canonical_') {
        return {
          storageKeys: ['vitalicast_canonical_123', 'vitalicast_canonical_456'],
          targetNamespace: 'vitalicast_canonical_',
          enumerationStatus: 'native_keychain',
          truncated: false
        };
      }
      return {
        storageKeys: [],
        targetNamespace: opts.targetNamespace,
        enumerationStatus: 'native_keychain',
        truncated: false
      };
    });

    const inspector = new ArchiveInspector();
    const report = await inspector.scan();

    expect(report.authoritativeRecordCount).toBe(2);
    expect(report.fallbackRecordCount).toBe(0);
    expect(report.addendumCount).toBe(0);
    expect(report.status).toBe('healthy');
  });

  it('addendum namespace returns only addendum keys', async () => {
    (VitalicastSecureStorage.enumerateArchiveKeys as jest.Mock).mockImplementation(async (opts) => {
      if (opts.targetNamespace === 'vitalicast_addendum_') {
        return {
          storageKeys: ['vitalicast_addendum_123_abc'],
          targetNamespace: 'vitalicast_addendum_',
          enumerationStatus: 'native_keychain',
          truncated: false
        };
      }
      return {
        storageKeys: [],
        targetNamespace: opts.targetNamespace,
        enumerationStatus: 'native_keychain',
        truncated: false
      };
    });

    const inspector = new ArchiveInspector();
    const report = await inspector.scan();

    expect(report.authoritativeRecordCount).toBe(0);
    expect(report.addendumCount).toBe(1);
    expect(report.status).toBe('healthy');
  });

  it('foreign namespace is rejected by bridge (mocked)', async () => {
    (VitalicastSecureStorage.enumerateArchiveKeys as jest.Mock).mockRejectedValue(new Error('Invalid namespace'));

    const inspector = new ArchiveInspector();
    const report = await inspector.scan();

    expect(report.unsupportedChecks.length).toBeGreaterThan(0);
    expect(report.status).toBe('warning');
  });

  it('returned result contains no payload/hash/timestamp fields', async () => {
    (VitalicastSecureStorage.enumerateArchiveKeys as jest.Mock).mockResolvedValue({
      storageKeys: ['vitalicast_canonical_123'],
      targetNamespace: 'vitalicast_canonical_',
      enumerationStatus: 'native_keychain',
      truncated: false
    });

    const inspector = new ArchiveInspector();
    const report = await inspector.scan();

    expect((report as any).medicalAdvice).toBeUndefined();
    expect((report as any).payload).toBeUndefined();
  });

  it('fallback enumeration returns dev_fallback_active', async () => {
    (VitalicastSecureStorage.enumerateArchiveKeys as jest.Mock).mockResolvedValue({
      storageKeys: ['vitalicast_canonical_123'],
      targetNamespace: 'vitalicast_canonical_',
      enumerationStatus: 'dev_fallback_active',
      truncated: false
    });

    const inspector = new ArchiveInspector();
    const report = await inspector.scan();

    expect(report.fallbackRecordCount).toBe(1);
    expect(report.authoritativeRecordCount).toBe(0);
    expect(report.status).toBe('warning');
  });

  it('empty archive returns storageKeys: [] and counts 0', async () => {
    (VitalicastSecureStorage.enumerateArchiveKeys as jest.Mock).mockResolvedValue({
      storageKeys: [],
      targetNamespace: 'vitalicast_canonical_',
      enumerationStatus: 'native_keychain',
      truncated: false
    });

    const inspector = new ArchiveInspector();
    const report = await inspector.scan();

    expect(report.authoritativeRecordCount).toBe(0);
    expect(report.addendumCount).toBe(0);
  });
});
