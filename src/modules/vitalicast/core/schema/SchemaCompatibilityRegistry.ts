export interface CertifiedSchemaMatch {
  identity: 'telemetry_batch_legacy_signature_1';
  payload: any;
}

export function certifyPayloadCompatibility(payloadStr: string): CertifiedSchemaMatch | null {
  let parsed: any;
  try {
    parsed = JSON.parse(payloadStr);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  // EXACT-TYPE RULE: check required top-level fields
  if (!Object.prototype.hasOwnProperty.call(parsed, 'domain') || parsed.domain !== 'vitalicast') {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, 'type') || parsed.type !== 'telemetry_batch') {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, 'timestamp') || typeof parsed.timestamp !== 'string') {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, 'samples') || !Array.isArray(parsed.samples)) {
    return null;
  }

  // EXPLICIT SCHEMA VERSION RULE:
  // If 'schemaVersion' or similar exists, and it's not handled, fail closed.
  const unhandledVersionFields = ['schemaVersion', 'schema_version', 'version', 'formatVersion', 'revision'];
  for (const field of unhandledVersionFields) {
    if (Object.prototype.hasOwnProperty.call(parsed, field)) {
      return null;
    }
  }

  // Nested structure check
  for (let i = 0; i < parsed.samples.length; i++) {
    const sample = parsed.samples[i];
    if (typeof sample !== 'object' || sample === null || Array.isArray(sample)) {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(sample, 'timestamp') || typeof sample.timestamp !== 'string') {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(sample, 'heartRate') || typeof sample.heartRate !== 'number') {
      return null;
    }
    // Closed nested structure policy: unknown fields in sample fail closed
    const allowedSampleKeys = ['timestamp', 'heartRate'];
    const actualSampleKeys = Object.keys(sample);
    if (actualSampleKeys.length !== allowedSampleKeys.length) {
      return null;
    }
    for (const key of actualSampleKeys) {
      if (!allowedSampleKeys.includes(key)) {
        return null;
      }
    }
  }

  // Additive top-level field policy is open, so no length check on parsed object keys needed.

  return {
    identity: 'telemetry_batch_legacy_signature_1',
    payload: parsed
  };
}
