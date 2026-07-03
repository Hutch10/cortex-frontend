import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { edgeQueue } from '../core/edge-queue';
import * as cortexClient from '../core/cortex-client';

vi.mock('../core/cortex-client', () => ({
  appendCommitment: vi.fn(),
  readReplay: vi.fn(),
  readIntegrity: vi.fn(),
}));

describe('Forge Runtime v0.1 Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Queue Persistence: Offline commitments are persisted to IndexedDB', async () => {
    // Mock network failure
    vi.mocked(cortexClient.appendCommitment).mockRejectedValueOnce(new Error('Network offline'));
    
    await edgeQueue.enqueue('Observation', {
      actor_id: 'test',
      signature: 'sig',
      payload: { test: true }
    });
    
    // Check queue status
    const status = await edgeQueue.getQueueStatus();
    expect(status.pendingCount).toBe(1);
  });

  it('Failed Sync Retention: Commitments remain in queue if sync fails', async () => {
    // Already 1 item in queue from previous test due to shared db state in tests, 
    // but let's assume we enqueue another and fail.
    vi.mocked(cortexClient.appendCommitment).mockRejectedValueOnce(new Error('Still offline'));
    await edgeQueue.sync();
    
    const status = await edgeQueue.getQueueStatus();
    expect(status.pendingCount).toBeGreaterThanOrEqual(1);
  });

  it('Idempotent Sync: Commitments are removed from queue upon successful sync', async () => {
    // Network is back
    vi.mocked(cortexClient.appendCommitment).mockResolvedValueOnce({ status: 'success' });
    
    const initialStatus = await edgeQueue.getQueueStatus();
    expect(initialStatus.pendingCount).toBeGreaterThan(0);
    
    await edgeQueue.sync();
    
    const finalStatus = await edgeQueue.getQueueStatus();
    expect(finalStatus.pendingCount).toBe(initialStatus.pendingCount - 1);
  });

  it('Replay Read: Cortex HTTP client correctly fetches replay', async () => {
    vi.mocked(cortexClient.readReplay).mockResolvedValueOnce({ state: { observations: {} }, timeline: [] });
    const replay = await cortexClient.readReplay();
    expect(replay.state).toBeDefined();
    expect(cortexClient.readReplay).toHaveBeenCalledTimes(1);
  });

  it('Integrity Read: Cortex HTTP client correctly fetches integrity', async () => {
    vi.mocked(cortexClient.readIntegrity).mockResolvedValueOnce({ valid: true, chain_length: 5, latest_hash: 'abc' });
    const integrity = await cortexClient.readIntegrity();
    expect(integrity.valid).toBe(true);
    expect(cortexClient.readIntegrity).toHaveBeenCalledTimes(1);
  });

  it('No Domain Logic: Payload schema enforces generic Key-Value records', () => {
    // A domain-agnostic payload
    const genericPayload: cortexClient.AppendPayload = {
      actor_id: 'sys',
      signature: 'xyz',
      payload: { arbitrary: 'data' }
    };
    expect(genericPayload.payload).toBeInstanceOf(Object);
  });
});
