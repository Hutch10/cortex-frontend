export type PayloadClassificationState =
  | 'supported_structured_record'
  | 'supported_structured_addendum'
  | 'structurally_unknown_payload'
  | 'malformed_payload';

export interface PayloadClassification {
  state: PayloadClassificationState;
  knownFields: Record<string, any>;
  unknownFields: Record<string, any>;
}

export function classifyPayload(payload: string): PayloadClassification {
  let parsed: any;
  try {
    parsed = JSON.parse(payload);
  } catch (err) {
    return {
      state: 'malformed_payload',
      knownFields: {},
      unknownFields: {}
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      state: 'structurally_unknown_payload',
      knownFields: {},
      unknownFields: parsed === null ? { root: null } : (typeof parsed === 'object' ? parsed : { root: parsed })
    };
  }

  const { domain, type, timestamp, samples, ...rest } = parsed;
  
  const hasValidDomain = domain === 'vitalicast';
  
  if (!hasValidDomain) {
    return {
      state: 'structurally_unknown_payload',
      knownFields: {},
      unknownFields: parsed
    };
  }

  if (type === 'telemetry_batch') {
    // Record explicit exact shape: requires timestamp string and samples array
    if (typeof timestamp === 'string' && Array.isArray(samples)) {
      const knownFields = { domain, type, timestamp, samples };
      return {
        state: 'supported_structured_record',
        knownFields,
        unknownFields: rest
      };
    }
  } else if (type === 'telemetry_addendum') {
    return {
      state: 'supported_structured_addendum',
      knownFields: { domain, type },
      unknownFields: rest
    };
  }

  // If it's a mock test payload like { domain: 'vitalicast' } without type, or unsupported type
  return {
    state: 'structurally_unknown_payload',
    knownFields: {},
    unknownFields: parsed
  };
}
