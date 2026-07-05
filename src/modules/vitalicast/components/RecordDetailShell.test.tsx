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
vi.mock('./RawPayloadViewer', () => ({
  RawPayloadViewer: ({ payload }: any) => (
    payload ? <div data-testid="mock-raw-viewer">{payload}</div> : null
  )
}));
vi.mock('./StructuralSchemaRenderer', () => ({
  StructuralSchemaRenderer: ({ rawPayload }: any) => (
    rawPayload ? <div data-testid="mock-structural-renderer">{rawPayload}</div> : null
  )
}));

describe('RecordDetailShell Phase 4 & Sprint 7', () => {
  let mockStorage: any;
  let getDeferred: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    getDeferred = () => {
      let resolve: any;
      let reject: any;
      const promise = new Promise<{value: string | null}>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    mockStorage = {
      readSecureRecord: vi.fn(),
    };
  });

  const validRecordPayload = JSON.stringify({ domain: 'vitalicast', type: 'telemetry_batch', timestamp: '2026', samples: [] });
  const malformedRecordPayload = 'this is not valid';

  it('A. selecting A starts exact read for A only', async () => {
    mockStorage.readSecureRecord.mockResolvedValueOnce({ value: validRecordPayload });
    render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    expect(mockStorage.readSecureRecord).toHaveBeenCalledTimes(1);
    expect(mockStorage.readSecureRecord).toHaveBeenCalledWith({ storageKey: "vitalicast_canonical_A" });
  });

  it('B. selecting B after A starts exact read for B only', async () => {
    mockStorage.readSecureRecord.mockResolvedValue({ value: validRecordPayload });
    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    
    expect(mockStorage.readSecureRecord).toHaveBeenLastCalledWith({ storageKey: "vitalicast_canonical_A" });
    
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    expect(mockStorage.readSecureRecord).toHaveBeenCalledTimes(2);
    expect(mockStorage.readSecureRecord).toHaveBeenLastCalledWith({ storageKey: "vitalicast_canonical_B" });
  });

  it('C. late A success cannot overwrite B success (S. stale parse success protection)', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    
    mockStorage.readSecureRecord
      .mockReturnValueOnce(defA.promise)
      .mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);

    defB.resolve({ value: validRecordPayload });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-structural-renderer").textContent).toBe(validRecordPayload);
    });

    defA.resolve({ value: validRecordPayload.replace('batch', 'late_batch') });
    
    // Wait a tick to ensure no state update
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByTestId("mock-structural-renderer").textContent).toBe(validRecordPayload);
  });

  it('D. late A error cannot overwrite B success (T. stale parse error protection)', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    
    mockStorage.readSecureRecord
      .mockReturnValueOnce(defA.promise)
      .mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);

    defB.resolve({ value: validRecordPayload });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-structural-renderer").textContent).toBe(validRecordPayload);
    });

    defA.reject(new Error("Network error A"));
    
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByTestId("mock-structural-renderer").textContent).toBe(validRecordPayload);
    expect(screen.queryByTestId("error-message")).toBeNull();
  });

  it('E. selecting B immediately clears/hides A payload before B resolves (U. prior structural view removed)', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    
    mockStorage.readSecureRecord
      .mockReturnValueOnce(defA.promise)
      .mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    defA.resolve({ value: validRecordPayload });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-structural-renderer").textContent).toBe(validRecordPayload);
    });

    // Change to B
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    
    // A payload should be immediately gone while B is pending
    expect(screen.queryByTestId("mock-structural-renderer")).toBeNull();
  });

  it('F. B not-found cannot leave A payload visible (V. malformed/missing current record protection)', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise).mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    defA.resolve({ value: validRecordPayload });
    
    await waitFor(() => expect(screen.getByTestId("mock-structural-renderer")).toBeTruthy());

    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    
    // B resolves as not found (null)
    defB.resolve({ value: null });

    await waitFor(() => {
      expect(screen.getByText(/could not be resolved/)).toBeTruthy();
    });
    expect(screen.queryByTestId("mock-structural-renderer")).toBeNull();
  });

  it('renders raw viewer for unknown payload', async () => {
    const defA = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise);
    render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    
    // Malformed JSON falls back to raw viewer
    defA.resolve({ value: malformedRecordPayload });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-raw-viewer").textContent).toBe(malformedRecordPayload);
    });
    expect(screen.queryByTestId("mock-structural-renderer")).toBeNull();
  });

  it('M. readSecureRecord receives exact selected storageKey only (AE. exact read)', async () => {
    const defA = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise);
    render(<RecordDetailShell storageKey="vitalicast_canonical_A" displayLabel="Record 1" storage={mockStorage} />);
    
    expect(mockStorage.readSecureRecord).toHaveBeenCalledWith({ storageKey: "vitalicast_canonical_A" });
    const calls = mockStorage.readSecureRecord.mock.calls;
    expect(calls[0][0].displayLabel).toBeUndefined();
  });

  it('O. no raw storageKey rendered as detail context (W. raw storageKey hidden)', async () => {
    const defA = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise);
    const { container } = render(<RecordDetailShell storageKey="vitalicast_canonical_A123" displayLabel="Record 99" storage={mockStorage} />);
    
    const text = container.textContent || '';
    expect(text).toContain("Record 99");
    expect(text).not.toContain("vitalicast_canonical_A123");
  });
});
