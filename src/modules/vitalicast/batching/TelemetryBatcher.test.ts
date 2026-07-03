import { TelemetryBatcher } from './TelemetryBatcher';
import { edgeQueue } from '../../../core/edge-queue';

jest.mock('../../../core/edge-queue', () => ({
  edgeQueue: {
    enqueue: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('TelemetryBatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('flushes automatically when reaching max samples', async () => {
    const batcher = new TelemetryBatcher('actor-1', { maxSamples: 5 });
    
    batcher.addSample(72);
    batcher.addSample(73);
    batcher.addSample(74);
    batcher.addSample(75);
    
    expect(edgeQueue.enqueue).not.toHaveBeenCalled();

    // 5th sample should trigger flush
    await batcher.addSample(76);
    
    expect(edgeQueue.enqueue).toHaveBeenCalledTimes(1);
    const callArgs = (edgeQueue.enqueue as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toBe('Telemetry');
    expect(callArgs[1].payload.samples).toHaveLength(5);
  });

  it('flushes automatically on interval', async () => {
    const batcher = new TelemetryBatcher('actor-1', { flushIntervalMs: 10000 });
    batcher.start();
    
    batcher.addSample(80);
    batcher.addSample(81);
    
    expect(edgeQueue.enqueue).not.toHaveBeenCalled();

    // Advance time by 10s
    jest.advanceTimersByTime(10000);

    // Give microtasks a chance to run since flush is async
    await Promise.resolve();

    expect(edgeQueue.enqueue).toHaveBeenCalledTimes(1);
    const callArgs = (edgeQueue.enqueue as jest.Mock).mock.calls[0];
    expect(callArgs[1].payload.samples).toHaveLength(2);
    
    batcher.stop();
  });

  it('clears buffer after flushing', async () => {
    const batcher = new TelemetryBatcher('actor-1');
    batcher.addSample(60);
    await batcher.flush();
    
    expect(edgeQueue.enqueue).toHaveBeenCalledTimes(1);
    
    // Manual flush again should do nothing since buffer is empty
    await batcher.flush();
    expect(edgeQueue.enqueue).toHaveBeenCalledTimes(1);
  });
});
