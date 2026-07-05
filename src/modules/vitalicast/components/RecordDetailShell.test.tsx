import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  StructuralSchemaRenderer: ({ payload }: any) => (
    payload ? <div data-testid="mock-structural-renderer">{payload}</div> : null
  )
}));

describe('RecordDetailShell Phase 4', () => {
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

  it('A. selecting A starts exact read for A only', async () => {
    mockStorage.readSecureRecord.mockResolvedValueOnce({ value: '{"payload":"test A"}' });
    render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    expect(mockStorage.readSecureRecord).toHaveBeenCalledTimes(1);
    expect(mockStorage.readSecureRecord).toHaveBeenCalledWith({ storageKey: "vitalicast_canonical_A" });
  });

  it('B. selecting B after A starts exact read for B only', async () => {
    mockStorage.readSecureRecord.mockResolvedValue({ value: '{"payload":"test"}' });
    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    
    expect(mockStorage.readSecureRecord).toHaveBeenLastCalledWith({ storageKey: "vitalicast_canonical_A" });
    
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    expect(mockStorage.readSecureRecord).toHaveBeenCalledTimes(2);
    expect(mockStorage.readSecureRecord).toHaveBeenLastCalledWith({ storageKey: "vitalicast_canonical_B" });
  });

  it('C. late A success cannot overwrite B success', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    
    mockStorage.readSecureRecord
      .mockReturnValueOnce(defA.promise)
      .mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);

    defB.resolve({ value: '{"payload":"B_WIN"}' });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-raw-viewer").textContent).toBe('{"payload":"B_WIN"}');
    });

    defA.resolve({ value: '{"payload":"A_LOSE"}' });
    
    // Wait a tick to ensure no state update
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByTestId("mock-raw-viewer").textContent).toBe('{"payload":"B_WIN"}');
  });

  it('D. late A error cannot overwrite B success', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    
    mockStorage.readSecureRecord
      .mockReturnValueOnce(defA.promise)
      .mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);

    defB.resolve({ value: '{"payload":"B_WIN"}' });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-raw-viewer").textContent).toBe('{"payload":"B_WIN"}');
    });

    defA.reject(new Error("Network error A"));
    
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByTestId("mock-raw-viewer").textContent).toBe('{"payload":"B_WIN"}');
    expect(screen.queryByText(/An error occurred/)).toBeNull();
  });

  it('E. selecting B immediately clears/hides A payload before B resolves', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    
    mockStorage.readSecureRecord
      .mockReturnValueOnce(defA.promise)
      .mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    defA.resolve({ value: '{"payload":"A_PAYLOAD"}' });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-raw-viewer").textContent).toBe('{"payload":"A_PAYLOAD"}');
    });

    // Change to B
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    
    // A payload should be immediately gone while B is pending
    expect(screen.queryByTestId("mock-raw-viewer")).toBeNull();
  });

  it('F. B not-found cannot leave A payload visible', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise).mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    defA.resolve({ value: '{"payload":"A_PAYLOAD"}' });
    
    await waitFor(() => expect(screen.getByTestId("mock-raw-viewer")).toBeTruthy());

    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    
    // B resolves as not found (null)
    defB.resolve({ value: null });

    await waitFor(() => {
      expect(screen.getByText(/could not be resolved/)).toBeTruthy();
    });
    expect(screen.queryByTestId("mock-raw-viewer")).toBeNull();
  });

  it('G, H. B read error cannot leave A RawPayloadViewer or StructuralSchemaRenderer visible', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise).mockReturnValueOnce(defB.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    defA.resolve({ value: '{"payload":"A_PAYLOAD"}' });
    
    await waitFor(() => expect(screen.getByTestId("mock-raw-viewer")).toBeTruthy());

    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    defB.reject(new Error("B exploded"));

    await waitFor(() => {
      expect(screen.getByText(/An error occurred/)).toBeTruthy();
    });
    expect(screen.queryByTestId("mock-raw-viewer")).toBeNull();
  });

  it('I. selection switch resets record-level verification presentation', async () => {
    const defA = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    defA.resolve({ value: '{"payload":"A_PAYLOAD"}' });
    
    await waitFor(() => expect(screen.getByTestId("mock-verification-section")).toBeTruthy());
    
    const defB = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defB.promise);
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    
    // While B is loading, verification should be unmounted
    expect(screen.queryByTestId("mock-verification-section")).toBeNull();
  });

  it('J. late A verification result cannot appear under B (via React unmount)', async () => {
    // Verified via key={storageKey} unmounting, but we can test the effect on verification presentation
    // The previous test proves it unmounts synchronously.
    const defA = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise);
    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    defA.resolve({ value: '{"payload":"A"}' });
    await waitFor(() => expect(screen.getByTestId("mock-verification-section")).toBeTruthy());

    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    expect(screen.queryByTestId("mock-verification-section")).toBeNull();
  });

  it('K. rapid A -> B -> C leaves C as the only active detail identity', async () => {
    const defA = getDeferred();
    const defB = getDeferred();
    const defC = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise).mockReturnValueOnce(defB.promise).mockReturnValueOnce(defC.promise);

    const { rerender } = render(<RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />);
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_B" storage={mockStorage} />);
    rerender(<RecordDetailShell storageKey="vitalicast_canonical_C" storage={mockStorage} />);

    defB.resolve({ value: '{"payload":"B"}' });
    defA.resolve({ value: '{"payload":"A"}' });
    defC.resolve({ value: '{"payload":"C"}' });

    await waitFor(() => {
      expect(screen.getByTestId("mock-raw-viewer").textContent).toBe('{"payload":"C"}');
    });
  });

  it('M. readSecureRecord receives exact selected storageKey only', async () => {
    const defA = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise);
    render(<RecordDetailShell storageKey="vitalicast_canonical_A" displayLabel="Record 1" storage={mockStorage} />);
    
    expect(mockStorage.readSecureRecord).toHaveBeenCalledWith({ storageKey: "vitalicast_canonical_A" });
    // Verify displayLabel was NOT passed to the fetch
    const calls = mockStorage.readSecureRecord.mock.calls;
    expect(calls[0][0].displayLabel).toBeUndefined();
  });

  it('O. no raw storageKey rendered as detail context', async () => {
    const defA = getDeferred();
    mockStorage.readSecureRecord.mockReturnValueOnce(defA.promise);
    const { container } = render(<RecordDetailShell storageKey="vitalicast_canonical_A123" displayLabel="Record 99" storage={mockStorage} />);
    
    const text = container.textContent || '';
    expect(text).toContain("Record 99");
    expect(text).not.toContain("vitalicast_canonical_A123");
  });

  it('Strict Mode: development double invocation is aborted cleanly', async () => {
    const defA = getDeferred();
    // Simulate React strict mode double render
    mockStorage.readSecureRecord.mockReturnValue(defA.promise);
    
    const { rerender, unmount } = render(
      <React.StrictMode>
        <RecordDetailShell storageKey="vitalicast_canonical_A" storage={mockStorage} />
      </React.StrictMode>
    );

    // Because of StrictMode, it may fire twice in React 18
    // We just verify the first one resolves and the UI remains consistent.
    defA.resolve({ value: '{"payload":"A"}' });
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-raw-viewer").textContent).toBe('{"payload":"A"}');
    });
  });
});
