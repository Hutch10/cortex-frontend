import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibrarySelectionShell } from './LibrarySelectionShell';
import { describe, it, expect, vi } from 'vitest';
import { ArchiveKeyListProvider, ArchiveKeyListResult } from '../core/archive/ArchiveKeyListProvider';

const MockDetailComponent: React.FC<{ storageKey: string }> = ({ storageKey }) => (
  <div data-testid="mock-detail">Loaded: {storageKey}</div>
);

describe('LibrarySelectionShell neutral labels and identity handling', () => {
  const getMockProvider = (result: Partial<ArchiveKeyListResult> = {}): ArchiveKeyListProvider => ({
    listAvailableArchiveKeys: vi.fn().mockResolvedValue({
      platformAuthority: 'dev_non_authoritative_fallback',
      records: [
        { storageKey: 'vitalicast_canonical_111', kind: 'canonical' },
        { storageKey: 'vitalicast_addendum_222', kind: 'addendum' },
        { storageKey: 'vitalicast_canonical_333', kind: 'canonical' }
      ],
      findings: [],
      rawPayloadReturned: false,
      ...result
    })
  });

  it('A, B, C: renders canonical and addendum with separate ordinals preserving order', async () => {
    const provider = getMockProvider({ platformAuthority: 'native_authoritative' });
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => {
      expect(screen.getByText('Record 1')).toBeTruthy();
      expect(screen.getByText('Addendum 1')).toBeTruthy();
      expect(screen.getByText('Record 2')).toBeTruthy();
    });
  });

  it('D, E: raw storageKey is not present in visible rendered text or as a fallback', async () => {
    const provider = getMockProvider();
    const { container } = render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => {
      expect(screen.getByText('Record 1')).toBeTruthy();
    });
    const text = container.textContent || '';
    expect(text).not.toContain('vitalicast_canonical_111');
    expect(text).not.toContain('vitalicast_addendum_222');
  });

  it('F: selecting Record 1 calls exact read logic with original canonical storageKey', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Record 1'));
    
    expect(screen.getByTestId('mock-detail')).toBeTruthy();
    expect(screen.getByTestId('mock-detail').textContent).toBe('Loaded: vitalicast_canonical_111');
  });

  it('G: selecting Addendum 1 calls exact read logic with original addendum storageKey', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Addendum 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Addendum 1'));
    
    expect(screen.getByTestId('mock-detail')).toBeTruthy();
    expect(screen.getByTestId('mock-detail').textContent).toBe('Loaded: vitalicast_addendum_222');
  });

  it('J, K: unsupported result preserves calm unsupported behavior and is not an authoritative empty archive', async () => {
    const provider = getMockProvider({ platformAuthority: 'unsupported', records: [] });
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Archive browsing requires an audited platform list provider/)).toBeTruthy();
    });
    expect(screen.queryByText('Library Selection')).toBeNull();
    expect(screen.queryByText(/archive empty/i)).toBeNull();
  });

  it('L: native_authoritative empty list uses bounded neutral wording', async () => {
    const provider = getMockProvider({ platformAuthority: 'native_authoritative', records: [] });
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => {
      expect(screen.getByText('No archive records available.')).toBeTruthy();
    });
  });

  it('M: dev_non_authoritative_fallback remains distinguishable', async () => {
    const provider = getMockProvider({ platformAuthority: 'dev_non_authoritative_fallback' });
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Development fallback list/)).toBeTruthy();
    });
  });

  it('N, O: native_authoritative does not create verification status or trigger completeness wording', async () => {
    const provider = getMockProvider({ platformAuthority: 'native_authoritative' });
    const { container } = render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record 1')).toBeTruthy());
    const text = container.textContent || '';
    expect(text).not.toMatch(/verified|authentic/i);
    expect(text).not.toMatch(/complete|all records|100%/i);
  });

  it('P: no URL/query/history storageKey exposure introduced', async () => {
    const provider = getMockProvider();
    render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record 1')).toBeTruthy());
    fireEvent.click(screen.getByText('Record 1'));
    
    expect(window.location.href).not.toContain('vitalicast_canonical_111');
  });

  it('U: no mutation APIs introduced or used', async () => {
    const provider = getMockProvider();
    const { container } = render(<LibrarySelectionShell provider={provider} DetailComponent={MockDetailComponent} />);
    
    await waitFor(() => expect(screen.getByText('Record 1')).toBeTruthy());
    const text = container.textContent || '';
    expect(text).not.toMatch(/delete|update|repair|clear|reset|mutation/i);
  });
});
