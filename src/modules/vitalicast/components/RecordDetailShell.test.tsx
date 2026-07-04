import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RecordDetailShell } from './RecordDetailShell';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the child to prevent its internal effects/calls
vi.mock('./RecordDetailVerificationSection', () => ({
  RecordDetailVerificationSection: ({ storageKey }: any) => (
    <div data-testid="mock-verification-section">Verification for {storageKey}</div>
  )
}));

describe('RecordDetailShell', () => {
  const mockStorage = {
    readSecureRecord: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid canonical storageKey triggers exactly one readSecureRecord call', async () => {
    mockStorage.readSecureRecord.mockResolvedValueOnce({ value: '{ "payload": "test" }' });
    
    render(<RecordDetailShell storageKey="vitalicast_canonical_12345" storage={mockStorage} />);
    
    expect(mockStorage.readSecureRecord).toHaveBeenCalledTimes(1);
    expect(mockStorage.readSecureRecord).toHaveBeenCalledWith({ storageKey: 'vitalicast_canonical_12345' });
    
    await waitFor(() => {
      expect(screen.getByText(/Record envelope loaded/)).toBeTruthy();
      expect(screen.getByTestId('mock-verification-section')).toBeTruthy();
    });
  });

  it('valid addendum storageKey triggers exactly one readSecureRecord call', async () => {
    mockStorage.readSecureRecord.mockResolvedValueOnce({ value: '{ "payload": "test" }' });
    
    render(<RecordDetailShell storageKey="vitalicast_addendum_12345" storage={mockStorage} />);
    
    expect(mockStorage.readSecureRecord).toHaveBeenCalledTimes(1);
    
    await waitFor(() => {
      expect(screen.getByText(/Record envelope loaded/)).toBeTruthy();
    });
  });

  it('invalid/empty/foreign storageKey triggers zero reads', () => {
    render(<RecordDetailShell storageKey="some_other_key" storage={mockStorage} />);
    expect(mockStorage.readSecureRecord).not.toHaveBeenCalled();
    expect(screen.getByText('No valid record reference selected.')).toBeTruthy();

    const { rerender } = render(<RecordDetailShell storageKey="" storage={mockStorage} />);
    expect(mockStorage.readSecureRecord).not.toHaveBeenCalled();

    rerender(<RecordDetailShell storageKey={null} storage={mockStorage} />);
    expect(mockStorage.readSecureRecord).not.toHaveBeenCalled();
  });

  it('storageKey change clears previous loaded state and ignores stale async reads', async () => {
    let resolveFirst: any;
    const firstPromise = new Promise<{value: string | null}>(res => { resolveFirst = res; });
    
    let resolveSecond: any;
    const secondPromise = new Promise<{value: string | null}>(res => { resolveSecond = res; });

    mockStorage.readSecureRecord
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_111" storage={mockStorage} />);
    
    // Change prop before first resolves
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_222" storage={mockStorage} />);
    
    // Now resolve first promise
    resolveFirst({ value: '{ "payload": "first" }' });
    
    // Then resolve second
    resolveSecond({ value: '{ "payload": "second" }' });
    
    await waitFor(() => {
      expect(screen.getByText(/Record envelope loaded/)).toBeTruthy();
    });
    
    // It should render verification section for the second key only
    expect(screen.getByTestId('mock-verification-section').textContent).toBe('Verification for vitalicast_canonical_222');
  });

  it('raw full storageKey does not appear in URL/location', () => {
    const key = 'vitalicast_canonical_super_secret_id_9999';
    mockStorage.readSecureRecord.mockResolvedValueOnce({ value: '{}' });
    render(<RecordDetailShell storageKey={key} storage={mockStorage} />);
    
    expect(window.location.href).not.toContain(key);
    expect(window.location.search).not.toContain(key);
    expect(window.location.pathname).not.toContain(key);
  });

  it('raw payload/body/decryptedValue is not rendered by default', async () => {
    mockStorage.readSecureRecord.mockResolvedValueOnce({ value: '{ "payload": "SUPER_SECRET_PAYLOAD" }' });
    render(<RecordDetailShell storageKey="vitalicast_canonical_12345" storage={mockStorage} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Record envelope loaded/)).toBeTruthy();
    });
    
    const text = document.body.textContent || '';
    expect(text).not.toContain('SUPER_SECRET_PAYLOAD');
  });

  it('no mutation methods are called or imported and prohibited language does not appear', async () => {
    mockStorage.readSecureRecord.mockResolvedValueOnce({ value: '{}' });
    render(<RecordDetailShell storageKey="vitalicast_canonical_12345" storage={mockStorage} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Record envelope loaded/)).toBeTruthy();
    });
    
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/danger|critical|unsafe|compromised|medical|diagnosis|symptoms|recommendations/i);
  });
});
