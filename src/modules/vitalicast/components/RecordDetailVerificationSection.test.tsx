import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordDetailVerificationSection } from './RecordDetailVerificationSection';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RecordVerificationResult } from '../core/inspector/types';

describe('RecordDetailVerificationSection', () => {
  const mockVerifier = {
    verifyRecordIntegrity: vi.fn(),
  };

  const baseResult: RecordVerificationResult = {
    verificationStatus: 'verified',
    storageKey: 'vitalicast_canonical_123',
    recordKind: 'canonical',
    checkedAt: '2023-01-01T00:00:00.000Z',
    hashAlgorithm: 'SHA-256',
    findings: [],
    rawPayloadReturned: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid canonical key renders Data Integrity Details wrapper and panel', () => {
    render(<RecordDetailVerificationSection storageKey="vitalicast_canonical_123" verifier={mockVerifier} />);
    fireEvent.click(screen.getByText('Data Integrity Details'));
    
    expect(screen.getByText('Verify Record Structure')).toBeTruthy();
    expect(screen.queryByText('Verification is unavailable for this record reference.')).toBeNull();
  });

  it('valid addendum key renders Data Integrity Details wrapper and panel', () => {
    render(<RecordDetailVerificationSection storageKey="vitalicast_addendum_456" verifier={mockVerifier} />);
    fireEvent.click(screen.getByText('Data Integrity Details'));
    
    expect(screen.getByText('Verify Record Structure')).toBeTruthy();
  });

  it('invalid foreign prefix does not render active RecordVerificationPanel behavior', () => {
    render(<RecordDetailVerificationSection storageKey="some_other_key" verifier={mockVerifier} />);
    fireEvent.click(screen.getByText('Data Integrity Details'));
    
    expect(screen.getByText('Verification is unavailable for this record reference.')).toBeTruthy();
    expect(screen.queryByText('Verify Record Structure')).toBeNull();
  });

  it('invalid/empty key does not call verifier', () => {
    render(<RecordDetailVerificationSection storageKey="" verifier={mockVerifier} />);
    fireEvent.click(screen.getByText('Data Integrity Details'));
    
    expect(screen.getByText('Verification is unavailable for this record reference.')).toBeTruthy();
    expect(mockVerifier.verifyRecordIntegrity).not.toHaveBeenCalled();
  });

  it('mounting wrapper does not call verifier', () => {
    render(<RecordDetailVerificationSection storageKey="vitalicast_canonical_123" verifier={mockVerifier} />);
    expect(mockVerifier.verifyRecordIntegrity).not.toHaveBeenCalled();
    
    // Even after expanding
    fireEvent.click(screen.getByText('Data Integrity Details'));
    expect(mockVerifier.verifyRecordIntegrity).not.toHaveBeenCalled();
  });

  it('clicking through child Verify Record Structure calls verifier exactly once for exact storageKey', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce(baseResult);
    render(<RecordDetailVerificationSection storageKey="vitalicast_canonical_123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Data Integrity Details'));
    fireEvent.click(screen.getByText('Verify Record Structure'));
    
    expect(mockVerifier.verifyRecordIntegrity).toHaveBeenCalledTimes(1);
    expect(mockVerifier.verifyRecordIntegrity).toHaveBeenCalledWith('vitalicast_canonical_123');
  });

  it('storageKey change clears prior result through key-based remount behavior', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce(baseResult);
    const { rerender } = render(<RecordDetailVerificationSection storageKey="vitalicast_canonical_123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Data Integrity Details'));
    fireEvent.click(screen.getByText('Verify Record Structure'));
    
    await waitFor(() => {
      expect(screen.getByText('Structure Intact')).toBeTruthy();
    });

    // Rerender with new key
    rerender(<RecordDetailVerificationSection storageKey="vitalicast_canonical_456" verifier={mockVerifier} />);
    
    // Should clear the result (since key=storageKey forces remount)
    expect(screen.queryByText('Structure Intact')).toBeNull();
  });

  it('array/bulk input is rejected at type level or runtime guard', () => {
    const badKey: any = ['vitalicast_canonical_1', 'vitalicast_canonical_2'];
    render(<RecordDetailVerificationSection storageKey={badKey} verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Data Integrity Details'));
    expect(screen.getByText('Verification is unavailable for this record reference.')).toBeTruthy();
  });

  it('no raw payload/body/decryptedValue is rendered and prohibited language does not appear', () => {
    render(<RecordDetailVerificationSection storageKey="vitalicast_canonical_123" verifier={mockVerifier} />);
    fireEvent.click(screen.getByText('Data Integrity Details'));
    
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/danger|critical|unsafe|compromised|medical|diagnosis|symptoms|recommendations/i);
    expect(text).not.toMatch(/raw payload|body|decryptedValue/i);
  });
});
