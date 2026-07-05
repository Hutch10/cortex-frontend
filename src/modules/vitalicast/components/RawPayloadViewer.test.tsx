import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RawPayloadViewer } from './RawPayloadViewer';

describe('RawPayloadViewer', () => {
  it('renders nothing when payload is missing', () => {
    const { container } = render(<RawPayloadViewer payload={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders tree and raw modes for valid JSON', () => {
    render(<RawPayloadViewer payload='{"test": 123}' />);
    expect(screen.getByText('Raw Record Data')).toBeTruthy();
    
    fireEvent.click(screen.getByText('Raw Record Data'));

    // Tree mode default
    expect(screen.getByText('test')).toBeTruthy();
    expect(screen.getByText('123')).toBeTruthy();

    fireEvent.click(screen.getByText('View Raw JSON'));
    expect(screen.getByText('{"test": 123}')).toBeTruthy();
  });

  it('renders gracefully for malformed JSON', () => {
    render(<RawPayloadViewer payload='this is not valid json_malformed' />);
    fireEvent.click(screen.getByText('Raw Record Data'));

    expect(screen.getByText('Payload parsing unavailable.')).toBeTruthy();
    
    fireEvent.click(screen.getByText('View Raw JSON'));
    expect(screen.getByText('Payload parsing unavailable.')).toBeTruthy();
    expect(screen.getByText('this is not valid json_malformed')).toBeTruthy();
  });
});
