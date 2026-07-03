import { edgeQueue } from '../../../core/edge-queue';
import { VitalSample, VitalicastBatchPayload } from '../schema';

export interface BatcherOptions {
  maxSamples?: number;
  flushIntervalMs?: number;
}

export class TelemetryBatcher {
  private samples: VitalSample[] = [];
  private maxSamples: number;
  private flushIntervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;
  private actorId: string;

  constructor(actorId: string, options?: BatcherOptions) {
    this.actorId = actorId;
    this.maxSamples = options?.maxSamples || 60; // 60 seconds of 1Hz data
    this.flushIntervalMs = options?.flushIntervalMs || 60000; // 1 minute
  }

  public start() {
    if (!this.intervalId && typeof window !== 'undefined') {
      this.intervalId = setInterval(() => {
        this.flush();
      }, this.flushIntervalMs);
      
      // Best-effort flush on page unload
      window.addEventListener('beforeunload', this.handleUnload);
    }
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (typeof window !== 'undefined') {
       window.removeEventListener('beforeunload', this.handleUnload);
    }
    this.flush();
  }

  private handleUnload = () => {
    this.flush();
  };

  public addSample(heartRate: number) {
    const sample: VitalSample = {
      timestamp: new Date().toISOString(),
      heartRate
    };
    this.samples.push(sample);

    if (this.samples.length >= this.maxSamples) {
      this.flush();
    }
  }

  public async flush() {
    if (this.samples.length === 0) return;

    const batchToFlush = [...this.samples];
    this.samples = []; // clear buffer immediately to prevent duplicate flushes if async hangs

    const payload: VitalicastBatchPayload = {
      domain: 'vitalicast',
      type: 'telemetry_batch',
      timestamp: new Date().toISOString(),
      samples: batchToFlush
    };

    try {
      await edgeQueue.enqueue('Observation', {
        actor_id: this.actorId,
        signature: 'mock_vitalicast_signature',
        payload
      });
    } catch (e) {
      console.error("Failed to enqueue Vitalicast telemetry batch", e);
      // In a robust implementation, we might requeue the failed samples, 
      // but EdgeQueue itself handles offline persistence.
    }
  }
}
