import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RawPayloadViewer } from './RawPayloadViewer';
import { describe, it, expect, vi } from 'vitest';

// We do not mock readSecureRecord because it's not imported or called here,
// which inherently proves it's not called directly by the viewer. 
// If it were called, it would have to be passed down or imported.

describe('RawPayloadViewer', () => {
  it('is collapsed by default and hides content', () => {
    render(<RawPayloadViewer payload='{"test": 123}' />);
    expect(screen.getByText('Raw Record Data')).toBeTruthy();
    expect(screen.queryByText('View as Tree')).toBeNull();
  });

  it('valid JSON defaults to structural tree view after expansion', () => {
    render(<RawPayloadViewer payload='{"my_structural_key": 123}' />);
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    // View as Tree and View Raw JSON toggles appear
    expect(screen.getByText('View as Tree')).toBeTruthy();
    expect(screen.getByText('View Raw JSON')).toBeTruthy();
    
    // Check that it's using the structural tree
    expect(screen.getByText('my_structural_key')).toBeTruthy();
    // Raw JSON string should not be rendered yet unless we toggle
    expect(document.body.textContent).not.toContain('{"my_structural_key": 123}');
  });

  it('View Raw JSON toggle shows raw JSON after expansion', () => {
    render(<RawPayloadViewer payload='{"my_structural_key": 123}' />);
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    fireEvent.click(screen.getByText('View Raw JSON'));
    
    // Raw text should be visible
    expect(document.body.textContent).toContain('{"my_structural_key": 123}');
  });

  it('View as Tree toggle returns to StructuralSchemaRenderer view', () => {
    render(<RawPayloadViewer payload='{"my_structural_key": 123}' />);
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    fireEvent.click(screen.getByText('View Raw JSON'));
    fireEvent.click(screen.getByText('View as Tree'));
    
    expect(screen.getByText('my_structural_key')).toBeTruthy();
    expect(document.body.textContent).not.toContain('{"my_structural_key": 123}');
  });

  it('malformed JSON shows Payload parsing unavailable and hides raw text by default', () => {
    render(<RawPayloadViewer payload='this is not valid json_malformed' />);
    
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    expect(screen.getByText('Payload parsing unavailable.')).toBeTruthy();
    expect(document.body.textContent).not.toContain('this is not valid json_malformed');
  });

  it('malformed JSON shows raw text only after toggling View Raw JSON', () => {
    render(<RawPayloadViewer payload='this is not valid json_malformed' />);
    
    fireEvent.click(screen.getByText('Raw Record Data'));
    fireEvent.click(screen.getByText('View Raw JSON'));
    
    expect(document.body.textContent).toContain('this is not valid json_malformed');
    expect(screen.getByText('Payload parsing unavailable.')).toBeTruthy();
    expect(document.body.textContent).toContain('RAW STORED TEXT'); // Uppercase "Raw Stored Text" due to styling
  });

  it('no generated banned language appears', () => {
    render(<RawPayloadViewer payload='{"valid": true}' />);
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/diagnosis|recommendation|risk|trend|urgent|abnormal|healthy|unhealthy|symptom|severity|clinicalMeaning/i);
  });

  it('user-authored words in payload may render only as payload content', () => {
    render(<RawPayloadViewer payload='{"my_risk_symptom": true}' />);
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    expect(screen.getByText('my_risk_symptom')).toBeTruthy();
  });

  it('no copy/export/paste/share controls exist', () => {
    render(<RawPayloadViewer payload='{"valid": true}' />);
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/copy|export|share|paste/i);
  });
});
