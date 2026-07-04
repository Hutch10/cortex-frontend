import { VitalicastSecureStorage } from '../bridge/SecureStorageBridge';
import { RecordVerificationResult, VerificationFinding, RecordKind } from './types';

export class RecordIntegrityVerifier {
  public async verifyRecordIntegrity(storageKey: string): Promise<RecordVerificationResult> {
    const findings: VerificationFinding[] = [];
    const checkedAt = new Date().toISOString();
    let recordKind: RecordKind = 'canonical';

    if (storageKey.startsWith('vitalicast_canonical_')) {
      recordKind = 'canonical';
    } else if (storageKey.startsWith('vitalicast_addendum_')) {
      recordKind = 'addendum';
    } else {
      findings.push({ code: 'unsupported_prefix', message: 'Storage key prefix is not supported.' });
      return this.buildResult('unsupported', storageKey, 'canonical', checkedAt, findings);
    }

    let rawValue: string | null = null;
    try {
      const response = await VitalicastSecureStorage.readSecureRecord({ storageKey });
      rawValue = response.value;

      if (!rawValue) {
        findings.push({ code: 'missing_record', message: 'Record not found in secure storage.' });
        return this.buildResult('malformed', storageKey, recordKind, checkedAt, findings);
      }

      let envelope: any = null;
      try {
        envelope = JSON.parse(rawValue);
      } catch (e) {
        findings.push({ code: 'json_parse_error', message: 'Payload envelope is not valid JSON.' });
        return this.buildResult('malformed', storageKey, recordKind, checkedAt, findings);
      }

      const payload = envelope.payload;
      if (!payload) {
        findings.push({ code: 'missing_payload', message: 'Envelope does not contain a payload field.' });
        return this.buildResult('malformed', storageKey, recordKind, checkedAt, findings);
      }

      if (recordKind === 'canonical') {
        const payloadHash = envelope.payloadHash;
        if (!payloadHash) {
          findings.push({ code: 'missing_field', message: 'Envelope missing payloadHash.' });
          return this.buildResult('malformed', storageKey, recordKind, checkedAt, findings);
        }

        const computedHash = await this.computeSha256(payload);
        if (computedHash !== payloadHash) {
          findings.push({ code: 'hash_mismatch', message: 'Computed payload hash does not match stored payloadHash.' });
          return this.buildResult('mismatch', storageKey, recordKind, checkedAt, findings);
        }
      } else if (recordKind === 'addendum') {
        const addendumHash = envelope.addendumHash;
        if (!addendumHash) {
          findings.push({ code: 'missing_field', message: 'Envelope missing addendumHash.' });
          return this.buildResult('malformed', storageKey, recordKind, checkedAt, findings);
        }

        const canonicalRecordHash = envelope.canonicalRecordHash;
        if (!canonicalRecordHash || typeof canonicalRecordHash !== 'string' || canonicalRecordHash.trim() === '') {
          findings.push({ code: 'missing_field', message: 'Envelope missing valid canonicalRecordHash.' });
          return this.buildResult('malformed', storageKey, recordKind, checkedAt, findings);
        }

        findings.push({ code: 'parent_linkage_presence_checked', message: 'Parent linkage presence checked.' });
        findings.push({ code: 'parent_linkage_target_not_read_phase5', message: 'Parent linkage target not read in Phase 5.' });

        const computedHash = await this.computeSha256(payload);
        if (computedHash !== addendumHash) {
          findings.push({ code: 'hash_mismatch', message: 'Computed payload hash does not match stored addendumHash.' });
          return this.buildResult('mismatch', storageKey, recordKind, checkedAt, findings);
        }
      }

      return this.buildResult('verified', storageKey, recordKind, checkedAt, findings);
    } catch (error: any) {
      findings.push({ code: 'read_error', message: error?.message || 'Error reading secure record.' });
      return this.buildResult('unsupported', storageKey, recordKind, checkedAt, findings);
    } finally {
      // Memory minimization: ensure local payload string reference is cleared
      rawValue = null;
    }
  }

  private buildResult(
    verificationStatus: 'verified' | 'mismatch' | 'malformed' | 'unsupported',
    storageKey: string,
    recordKind: RecordKind,
    checkedAt: string,
    findings: VerificationFinding[]
  ): RecordVerificationResult {
    return {
      verificationStatus,
      storageKey,
      recordKind,
      checkedAt,
      hashAlgorithm: 'SHA-256',
      findings,
      rawPayloadReturned: false,
    };
  }

  private async computeSha256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
