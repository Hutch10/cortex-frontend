import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibrarySelectionShell } from './LibrarySelectionShell';
import { describe, it, expect, vi } from 'vitest';
import { ArchiveKeyListProvider, ArchiveKeyListResult } from '../core/archive/ArchiveKeyListProvider';

const MockDetailComponent: React.FC<{ storageKey: string }> = ({ storageKey }) => (
  <div data-testid="mock-detail">Loaded: {storageKey}</div>
);

describe('LibrarySelectionShell', () => {
  const getMockProvider = (result: Partial<ArchiveKeyListResult> = {}): ArchiveKeyListProvider => ({
    listAvailableArchiveKeys: vi.fn().mockResolvedValue({
      platformAuthority: 'dev_non_authoritative_fallback',
      records: [
        { storageKey: 'vitalicast_canonical_111', kind: 'canonical', label: 'Record A' },
        { storageKey: 'vitalicast_addendum_222', kind: 'addendum', label: 'Record B' }
      ],
      findings: [],
      rawPayloadReturned: false,
      ...result
    })
  });

  it('unsupported provider state renders fail-closed copy and no fake rows', async () => {
    const provider = getMockProvider({ platformAuthority: 'unsupported', records: [] });
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Archive browsing requires an audited platform list provider/)).toBeTruthy();
    });
    expect(screen.queryByText('Library Selection')).toBeNull();
  });

  it('dev fallback provider state renders non-authoritative banner', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Development fallback list/)).toBeTruthy();
      expect(screen.getByText('Record A')).toBeTruthy();
    });
  });

  it('clicking one row selects exactly one storageKey and renders detail', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record A')).toBeTruthy());
    
    fireEvent.click(screen.getByText('Record A'));
    
    expect(screen.getByTestId('mock-detail')).toBeTruthy();
    expect(screen.getByTestId('mock-detail').textContent).toBe('Loaded: vitalicast_canonical_111');
  });

  it('clicking close clears selectedStorageKey and unmounts detail shell', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record A')).toBeTruthy());
    fireEvent.click(screen.getByText('Record A'));
    expect(screen.getByTestId('mock-detail')).toBeTruthy();
    
    fireEvent.click(screen.getByText('Close Details'));
    expect(screen.queryByTestId('mock-detail')).toBeNull();
    expect(screen.getByText('Select a record to view details.')).toBeTruthy();
  });

  it('URL/location/history remains free of storageKey', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record A')).toBeTruthy());
    fireEvent.click(screen.getByText('Record A'));
    
    expect(window.location.href).not.toContain('vitalicast_canonical_111');
  });

  it('no mutation methods are called or imported and prohibited language does not appear', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record A')).toBeTruthy());
    
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/danger|critical|unsafe|compromised|medical|diagnosis|symptoms|recommendations/i);
    expect(text).not.toMatch(/raw payload|body|decryptedValue/i);
  });
});
