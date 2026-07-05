export interface VitalSample {
  timestamp: string;
  heartRate: number;
}

export interface VitalicastBatchPayload {
  domain: 'vitalicast';
  type: 'telemetry_batch';
  timestamp: string; // The time the batch was flushed
  samples: VitalSample[]; // Raw 1Hz (or similar) samples
}

export interface VitalicastAddendumPayload {
  domain: 'vitalicast';
  type: 'telemetry_addendum';
}
