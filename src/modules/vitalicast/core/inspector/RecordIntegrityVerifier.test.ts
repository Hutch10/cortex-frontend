import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordIntegrityVerifier } from './RecordIntegrityVerifier';
import { VitalicastSecureStorage } from '../bridge/SecureStorageBridge';

vi.mock('../bridge/SecureStorageBridge', () => ({
  VitalicastSecureStorage: {
    readSecureRecord: vi.fn(),
  },
}));

describe('RecordIntegrityVerifier', () => {
  let verifier: RecordIntegrityVerifier;

  beforeEach(() => {
    vi.clearAllMocks();
    verifier = new RecordIntegrityVerifier();

    // Mock global crypto
    const encoder = new TextEncoder();
    global.crypto = {
      subtle: {
        digest: vi.fn().mockImplementation(async (alg, data) => {
          // Fake SHA-256 just for testing, reverse string or something
          // Or just return a known buffer
          return new Uint8Array([100, 101, 102]).buffer; // "646566" in hex
        }),
      } as any,
    } as any;
  });

  it('verifies a valid canonical record', async () => {
    const payload = JSON.stringify({ domain: 'vitalicast', type: 'telemetry_batch' });
    const envelope = {
      payload,
      payloadHash: '646566',
    };
    (VitalicastSecureStorage.readSecureRecord as any).mockResolvedValue({ value: JSON.stringify(envelope) });

    const result = await verifier.verifyRecordIntegrity('vitalicast_canonical_123');

    expect(result.verificationStatus).toBe('verified');
    expect(result.recordKind).toBe('canonical');
    expect(result.rawPayloadReturned).toBe(false);
    expect((result as any).rawPayload).toBeUndefined();
    expect((result as any).payload).toBeUndefined();
    expect(VitalicastSecureStorage.readSecureRecord).toHaveBeenCalledWith({ storageKey: 'vitalicast_canonical_123' });
  });

  it('detects canonical hash mismatch', async () => {
    const payload = JSON.stringify({ domain: 'vitalicast' });
    const envelope = {
      payload,
      payloadHash: 'wronghash',
    };
    (VitalicastSecureStorage.readSecureRecord as any).mockResolvedValue({ value: JSON.stringify(envelope) });

    const result = await verifier.verifyRecordIntegrity('vitalicast_canonical_123');

    expect(result.verificationStatus).toBe('mismatch');
    expect(result.findings[0].code).toBe('hash_mismatch');
  });

  it('detects missing payloadHash', async () => {
    const payload = JSON.stringify({ domain: 'vitalicast' });
    const envelope = { payload };
    (VitalicastSecureStorage.readSecureRecord as any).mockResolvedValue({ value: JSON.stringify(envelope) });

    const result = await verifier.verifyRecordIntegrity('vitalicast_canonical_123');

    expect(result.verificationStatus).toBe('malformed');
    expect(result.findings[0].code).toBe('missing_field');
  });

  it('detects malformed JSON envelope', async () => {
    (VitalicastSecureStorage.readSecureRecord as any).mockResolvedValue({ value: '{ bad_json }' });

    const result = await verifier.verifyRecordIntegrity('vitalicast_canonical_123');

    expect(result.verificationStatus).toBe('malformed');
    expect(result.findings[0].code).toBe('json_parse_error');
  });

  it('rejects unsupported foreign storageKey prefix', async () => {
    const result = await verifier.verifyRecordIntegrity('some_other_key');

    expect(result.verificationStatus).toBe('unsupported');
    expect(result.findings[0].code).toBe('unsupported_prefix');
    expect(VitalicastSecureStorage.readSecureRecord).not.toHaveBeenCalled();
  });

  it('verifies a valid addendum record', async () => {
    const payload = JSON.stringify({ domain: 'vitalicast' });
    const envelope = {
      payload,
      addendumHash: '646566',
      canonicalRecordHash: 'parent_hash_123',
    };
    (VitalicastSecureStorage.readSecureRecord as any).mockResolvedValue({ value: JSON.stringify(envelope) });

    const result = await verifier.verifyRecordIntegrity('vitalicast_addendum_123_456');

    expect(result.verificationStatus).toBe('verified');
    expect(result.recordKind).toBe('addendum');
    expect(result.findings.some(f => f.code === 'parent_linkage_presence_checked')).toBe(true);
    expect(result.findings.some(f => f.code === 'parent_linkage_target_not_read_phase5')).toBe(true);
  });

  it('detects addendum missing canonicalRecordHash', async () => {
    const payload = JSON.stringify({ domain: 'vitalicast' });
    const envelope = {
      payload,
      addendumHash: '646566',
    };
    (VitalicastSecureStorage.readSecureRecord as any).mockResolvedValue({ value: JSON.stringify(envelope) });

    const result = await verifier.verifyRecordIntegrity('vitalicast_addendum_123_456');

    expect(result.verificationStatus).toBe('malformed');
    expect(result.findings[0].code).toBe('missing_field');
    expect(result.findings[0].message).toContain('canonicalRecordHash');
  });
});
