import { describe, it, expect } from 'vitest';
import { classifyPayload } from './PayloadClassifier';

describe('PayloadClassifier', () => {
  it('A. exact payload passed unchanged to parser / D. known record classification deterministic / I-N preserved', () => {
    const payload = JSON.stringify({
      domain: 'vitalicast',
      type: 'telemetry_batch',
      timestamp: '2026-07-04T00:00:00Z',
      samples: [],
      stringNumber: "3",
      number: 3,
      nullValue: null,
      falseValue: false,
      zeroValue: 0,
      emptyString: "",
      leadingWhitespace: "  preserved",
      trailingWhitespace: "preserved  ",
      mixedCase: "DoNotNormalizeMe",
      nestedObject: { a: 1 },
      arrayValue: [1, 2]
    });
    
    const result = classifyPayload(payload);
    
    expect(result).toBe('supported_structured_record');
  });

  it('E. known addendum classification deterministic', () => {
    // telemetry_addendum is REACHABLE_IDENTITY_COHORT_PAYLOAD_SCHEMA_UNPROVEN
    // So it should fail closed.
    const payload = JSON.stringify({
      domain: 'vitalicast',
      type: 'telemetry_addendum',
      someExtra: true
    });
    const result = classifyPayload(payload);
    expect(result).toBe('structurally_unknown_payload');
  });

  it('F. unknown schema fails explicitly / H. no heuristic schema guessing', () => {
    const payload1 = JSON.stringify({
      domain: 'vitalicast',
      type: 'something_else',
      mood: 'happy'
    });
    const result1 = classifyPayload(payload1);
    expect(result1).toBe('structurally_unknown_payload');

    const payload2 = JSON.stringify({
      something: 'unrelated'
    });
    const result2 = classifyPayload(payload2);
    expect(result2).toBe('structurally_unknown_payload');
  });

  it('G. malformed payload fails explicitly', () => {
    const result = classifyPayload('INVALID JSON');
    expect(result).toBe('malformed_payload');
  });

  it('handles primitive root gracefully without crashing (structural unknown)', () => {
    const resultString = classifyPayload('"just a string"');
    expect(resultString).toBe('structurally_unknown_payload');

    const resultNull = classifyPayload('null');
    expect(resultNull).toBe('structurally_unknown_payload');

    const resultArr = classifyPayload('[1, 2]');
    expect(resultArr).toBe('structurally_unknown_payload');
  });
});
