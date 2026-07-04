import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RawPayloadViewer } from './RawPayloadViewer';
import { describe, it, expect } from 'vitest';

describe('RawPayloadViewer', () => {
  it('renders nothing if payload is null or undefined', () => {
    const { container } = render(<RawPayloadViewer payload={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('is collapsed by default and hides content', () => {
    render(<RawPayloadViewer payload='{"test": 123}' />);
    expect(screen.getByText('Raw Record Data')).toBeTruthy();
    expect(screen.queryByText(/"test": 123/)).toBeNull();
  });

  it('expands to show valid JSON structurally', () => {
    render(<RawPayloadViewer payload='{"test": 123}' />);
    fireEvent.click(screen.getByText('Raw Record Data'));
    
    expect(screen.getByText(/"test":\s*123/)).toBeTruthy();
  });

  it('renders "Payload parsing unavailable" for malformed JSON without crashing or leaking raw text', () => {
    render(<RawPayloadViewer payload='this is not json' />);
    
    // Collapsed
    expect(screen.queryByText(/this is not json/)).toBeNull();
    
    // Expanded
    fireEvent.click(screen.getByText('Raw Record Data'));
    expect(screen.getByText('Payload parsing unavailable.')).toBeTruthy();
    expect(screen.queryByText(/this is not json/)).toBeNull();
  });

  it('prohibited language does not appear statically', () => {
    render(<RawPayloadViewer payload='{"valid": true}' />);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/danger|critical|unsafe|compromised|medical|diagnosis|symptoms|recommendations/i);
  });
});
