import { describe, it, expect } from 'vitest';
import { classifyPayload } from './PayloadClassifier';

describe('PayloadClassifier', () => {
  it('A. exact payload passed unchanged to parser / D. known record classification deterministic / I-N preserved', () => {
    // Tests A, D, I, J, K, L, M, N
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
    
    expect(result.state).toBe('supported_structured_record');
    expect(result.knownFields.domain).toBe('vitalicast');
    expect(result.knownFields.type).toBe('telemetry_batch');
    expect(result.knownFields.timestamp).toBe('2026-07-04T00:00:00Z');
    expect(result.knownFields.samples).toEqual([]);
    
    // Unknown fields exact fidelity check
    expect(result.unknownFields.stringNumber).toBe("3");
    expect(result.unknownFields.number).toBe(3);
    expect(result.unknownFields.nullValue).toBe(null);
    expect(result.unknownFields.falseValue).toBe(false);
    expect(result.unknownFields.zeroValue).toBe(0);
    expect(result.unknownFields.emptyString).toBe("");
    expect(result.unknownFields.leadingWhitespace).toBe("  preserved");
    expect(result.unknownFields.trailingWhitespace).toBe("preserved  ");
    expect(result.unknownFields.mixedCase).toBe("DoNotNormalizeMe");
    expect(result.unknownFields.nestedObject).toEqual({ a: 1 });
    expect(result.unknownFields.arrayValue).toEqual([1, 2]);
  });

  it('E. known addendum classification deterministic', () => {
    const payload = JSON.stringify({
      domain: 'vitalicast',
      type: 'telemetry_addendum',
      someExtra: true
    });
    const result = classifyPayload(payload);
    expect(result.state).toBe('supported_structured_addendum');
    expect(result.knownFields.domain).toBe('vitalicast');
    expect(result.knownFields.type).toBe('telemetry_addendum');
    expect(result.unknownFields.someExtra).toBe(true);
  });

  it('F. unknown schema fails explicitly / H. no heuristic schema guessing', () => {
    // Has vitalicast domain but wrong type
    const payload1 = JSON.stringify({
      domain: 'vitalicast',
      type: 'something_else',
      mood: 'happy'
    });
    const result1 = classifyPayload(payload1);
    expect(result1.state).toBe('structurally_unknown_payload');
    expect(result1.unknownFields.mood).toBe('happy');

    // Completely unknown shape
    const payload2 = JSON.stringify({
      something: 'unrelated'
    });
    const result2 = classifyPayload(payload2);
    expect(result2.state).toBe('structurally_unknown_payload');
    expect(result2.unknownFields.something).toBe('unrelated');
  });

  it('G. malformed payload fails explicitly', () => {
    const result = classifyPayload('INVALID JSON');
    expect(result.state).toBe('malformed_payload');
    expect(result.knownFields).toEqual({});
    expect(result.unknownFields).toEqual({});
  });

  it('handles primitive root gracefully without crashing (structural unknown)', () => {
    const resultString = classifyPayload('"just a string"');
    expect(resultString.state).toBe('structurally_unknown_payload');
    expect(resultString.unknownFields).toEqual({ root: "just a string" });

    const resultNull = classifyPayload('null');
    expect(resultNull.state).toBe('structurally_unknown_payload');
    expect(resultNull.unknownFields).toEqual({ root: null });

    const resultArr = classifyPayload('[1, 2]');
    expect(resultArr.state).toBe('structurally_unknown_payload');
    expect(resultArr.unknownFields).toEqual([1, 2]);
  });
});
