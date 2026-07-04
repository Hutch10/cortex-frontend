import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordVerificationPanel } from './RecordVerificationPanel';
import { RecordVerificationResult } from '../core/inspector/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('RecordVerificationPanel', () => {
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

  it('does not call verifier on mount', () => {
    render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    expect(mockVerifier.verifyRecordIntegrity).not.toHaveBeenCalled();
  });

  it('clicking Verify Record Structure calls verifier exactly once with the exact storageKey', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce(baseResult);
    render(<RecordVerificationPanel storageKey="test_key_123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Verify Record Structure'));
    expect(mockVerifier.verifyRecordIntegrity).toHaveBeenCalledTimes(1);
    expect(mockVerifier.verifyRecordIntegrity).toHaveBeenCalledWith('test_key_123');
  });

  it('verified renders Structure Intact', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce({ ...baseResult, verificationStatus: 'verified' });
    render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Verify Record Structure'));
    await waitFor(() => {
      expect(screen.getByText('Structure Intact')).toBeTruthy();
    });
  });

  it('mismatch renders Structural Mismatch Detected', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce({ ...baseResult, verificationStatus: 'mismatch' });
    render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Verify Record Structure'));
    await waitFor(() => {
      expect(screen.getByText('Structural Mismatch Detected')).toBeTruthy();
    });
  });

  it('malformed renders Format Unreadable', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce({ ...baseResult, verificationStatus: 'malformed' });
    render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Verify Record Structure'));
    await waitFor(() => {
      expect(screen.getByText('Format Unreadable')).toBeTruthy();
    });
  });

  it('unsupported renders Verification Unavailable on this Platform', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce({ ...baseResult, verificationStatus: 'unsupported' });
    render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Verify Record Structure'));
    await waitFor(() => {
      expect(screen.getByText('Verification Unavailable on this Platform')).toBeTruthy();
    });
  });

  it('Technical Log Overview defaults collapsed and expands findings', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce({ 
      ...baseResult, 
      findings: [{ code: 'test_finding', message: 'Something found' }] 
    });
    render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Verify Record Structure'));
    await waitFor(() => {
      expect(screen.getByText('Structure Intact')).toBeTruthy();
    });

    const toggleBtn = screen.getByText('Technical Log Overview');
    expect(toggleBtn).toBeTruthy();
    
    // Findings are not rendered yet
    expect(screen.queryByText('test_finding')).toBeNull();

    // Click to expand
    fireEvent.click(toggleBtn);
    expect(screen.getByText('test_finding')).toBeTruthy();
    expect(screen.getByText(/Something found/)).toBeTruthy();
  });

  it('storageKey change clears prior result', async () => {
    mockVerifier.verifyRecordIntegrity.mockResolvedValueOnce(baseResult);
    const { rerender } = render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    
    fireEvent.click(screen.getByText('Verify Record Structure'));
    await waitFor(() => {
      expect(screen.getByText('Structure Intact')).toBeTruthy();
    });

    // Change prop
    rerender(<RecordVerificationPanel storageKey="456" verifier={mockVerifier} />);
    
    // Result should be cleared
    expect(screen.queryByText('Structure Intact')).toBeNull();
  });

  it('raw payload/body/decryptedValue fields are not rendered and prohibited language does not appear', () => {
    render(<RecordVerificationPanel storageKey="123" verifier={mockVerifier} />);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/danger|critical|unsafe|compromised|medical|diagnosis|symptoms|recommendations/i);
    expect(text).not.toMatch(/raw payload|body|decryptedValue/i);
  });
});
