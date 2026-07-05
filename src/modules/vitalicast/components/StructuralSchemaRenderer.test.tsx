import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StructuralSchemaRenderer } from './StructuralSchemaRenderer';
import { PayloadClassification } from '../core/schema/PayloadClassifier';

describe('StructuralSchemaRenderer', () => {
  it('renders certified payload', () => {
    const classification: PayloadClassification = 'supported_structured_record';
    const rawPayload = JSON.stringify({
      domain: 'vitalicast',
      type: 'telemetry_batch',
      timestamp: '2026-07-04T00:00:00Z',
      samples: [],
      newSymptom: true
    });
    const { getByText } = render(<StructuralSchemaRenderer classification={classification} rawPayload={rawPayload} />);
    expect(getByText('Presented from the original archived payload. No archived values were changed.')).toBeTruthy();
    expect(getByText('vitalicast')).toBeTruthy();
    expect(getByText('telemetry_batch')).toBeTruthy();
  });

  it('renders structurally_unknown_payload', () => {
    const classification: PayloadClassification = 'structurally_unknown_payload';
    const rawPayload = JSON.stringify({ domain: 'vitalicast', type: 'telemetry_batch', bad: 1 });
    const { getByText } = render(<StructuralSchemaRenderer classification={classification} rawPayload={rawPayload} />);
    expect(getByText('Structural presentation is not available for this archived payload. The archived payload remains available for read-only inspection.')).toBeTruthy();
  });
});
