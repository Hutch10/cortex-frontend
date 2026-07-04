import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArchiveHealthDashboard } from './ArchiveHealthDashboard';
import { ArchiveInspector } from '../core/inspector/ArchiveInspector';
import { ArchiveHealthReport } from '../core/inspector/types';

jest.mock('../core/inspector/ArchiveInspector');

describe('ArchiveHealthDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReport: ArchiveHealthReport = {
    status: 'healthy',
    authoritativeRecordCount: 0,
    fallbackRecordCount: 0,
    addendumCount: 0,
    missingFieldFindings: [],
    hashMismatchFindings: [],
    linkageFindings: [],
    unsupportedChecks: [],
    scannedAt: '2023-01-01T00:00:00.000Z',
    isAuthoritativeEnvironment: true,
  };

  it('renders healthy report', async () => {
    (ArchiveInspector.prototype.scan as jest.Mock).mockResolvedValue({
      ...baseReport,
      authoritativeRecordCount: 5,
    });

    render(<ArchiveHealthDashboard />);
    fireEvent.click(screen.getByText('Run Archive Check'));

    await waitFor(() => {
      expect(screen.getByText('Overall Status: HEALTHY')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy(); // 5 authoritative records
    });
  });

  it('renders warning report for unsupported native enumeration', async () => {
    (ArchiveInspector.prototype.scan as jest.Mock).mockResolvedValue({
      ...baseReport,
      status: 'warning',
      unsupportedChecks: [{ checkName: 'secure_storage_key_enumeration_unavailable', reason: '' }],
    });

    render(<ArchiveHealthDashboard />);
    fireEvent.click(screen.getByText('Run Archive Check'));

    await waitFor(() => {
      expect(screen.getByText('Archive Key Inventory Locked Natively.')).toBeTruthy();
      expect(screen.getByText(/Key inventory enumeration is restricted/i)).toBeTruthy();
    });
  });

  it('renders fallback warning', async () => {
    (ArchiveInspector.prototype.scan as jest.Mock).mockResolvedValue({
      ...baseReport,
      fallbackRecordCount: 1,
      isAuthoritativeEnvironment: false,
    });

    render(<ArchiveHealthDashboard />);
    fireEvent.click(screen.getByText('Run Archive Check'));

    await waitFor(() => {
      expect(screen.getByText('Browser fallback records are non-authoritative development records.')).toBeTruthy();
    });
  });

  it('does not render medical/diagnostic/recommendation language', () => {
    render(<ArchiveHealthDashboard />);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/medical|diagnosis|recommendation/i);
  });
});
