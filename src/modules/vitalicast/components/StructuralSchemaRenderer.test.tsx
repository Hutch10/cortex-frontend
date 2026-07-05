import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StructuralSchemaRenderer } from './StructuralSchemaRenderer';
import { PayloadClassification } from '../core/schema/PayloadClassifier';

describe('StructuralSchemaRenderer', () => {
  it('renders known fields securely and unknown fields inspectably', () => {
    const classification: PayloadClassification = {
      state: 'supported_structured_record',
      knownFields: {
        domain: 'vitalicast',
        type: 'telemetry_batch',
        timestamp: '2026-07-04T00:00:00Z',
        samples: []
      },
      unknownFields: {
        newSymptom: true
      }
    };

    render(<StructuralSchemaRenderer classification={classification} rawPayload='{"domain":"vitalicast","type":"telemetry_batch","timestamp":"2026-07-04T00:00:00Z","samples":[],"newSymptom":true}' />);

    // Provenance language
    expect(screen.getByText('Presented from the original archived payload. No archived values were changed.')).toBeTruthy();

    // Known fields
    expect(screen.getByText('domain:')).toBeTruthy();
    expect(screen.getByText('vitalicast')).toBeTruthy();
    expect(screen.getByText('timestamp:')).toBeTruthy();
    expect(screen.getByText('2026-07-04T00:00:00Z')).toBeTruthy();

    // Unknown fields
    expect(screen.getByText('Additional archived fields')).toBeTruthy();
    expect(screen.getByText('1 fields preserved')).toBeTruthy();
    
    // Inspect toggle
    const toggle = screen.getByText('Inspect archived fields');
    fireEvent.click(toggle);

    // It renders the unknown field inside the summary
    expect(screen.getByText('newSymptom')).toBeTruthy();
    expect(screen.getByText('true')).toBeTruthy();
  });

  it('renders unknown state explicitly and falls back to RawPayloadViewer', () => {
    const classification: PayloadClassification = {
      state: 'structurally_unknown_payload',
      knownFields: {},
      unknownFields: { mood: 'happy' }
    };

    render(<StructuralSchemaRenderer classification={classification} rawPayload='{"mood":"happy"}' />);

    expect(screen.getByText('Unsupported structural presentation state.')).toBeTruthy();
    expect(screen.getByText('Raw Record Data')).toBeTruthy();
  });
});
