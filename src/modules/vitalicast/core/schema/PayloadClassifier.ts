import { certifyPayloadCompatibility } from './SchemaCompatibilityRegistry';

export type PayloadClassification = 
  | 'supported_structured_record'
  | 'supported_structured_addendum'
  | 'structurally_unknown_payload'
  | 'malformed_payload';

export interface ClassifiedPayload {
  classification: PayloadClassification;
  rawPayload: string;
}

export function classifyPayload(payload: string): PayloadClassification {
  const match = certifyPayloadCompatibility(payload);
  if (!match) {
    // We need to differentiate malformed_payload from structurally_unknown_payload
    try {
      JSON.parse(payload);
    } catch {
      return 'malformed_payload';
    }
    return 'structurally_unknown_payload';
  }
  
  if (match.identity === 'telemetry_batch_legacy_signature_1') {
    return 'supported_structured_record';
  }
  
  // Note: telemetry_addendum is REACHABLE_IDENTITY_COHORT_PAYLOAD_SCHEMA_UNPROVEN
  // So it will return structurally_unknown_payload for any addendum payload since it fails certifyPayloadCompatibility.
  
  return 'structurally_unknown_payload';
}
