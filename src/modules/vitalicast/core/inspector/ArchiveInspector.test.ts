import { ArchiveInspector } from './ArchiveInspector';

describe('ArchiveInspector', () => {
  it('returns a typed ArchiveHealthReport with warning status due to lack of enumeration', async () => {
    const inspector = new ArchiveInspector();
    const report = await inspector.scan();

    expect(report.status).toBe('warning');
    expect(report.unsupportedChecks.some(c => c.checkName === 'secure_storage_key_enumeration_unavailable')).toBe(true);
    expect(report.authoritativeRecordCount).toBe(0);
    expect(report.fallbackRecordCount).toBe(0);
    expect(report.addendumCount).toBe(0);
    expect(report.missingFieldFindings).toEqual([]);
    expect(report.hashMismatchFindings).toEqual([]);
    expect(report.linkageFindings).toEqual([]);
    
    // Ensure no medical/diagnostic fields exist.
    expect((report as any).medicalAdvice).toBeUndefined();
    expect((report as any).diagnosis).toBeUndefined();
  });
});
