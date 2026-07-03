import { describe, it, expect } from 'vitest';
import { mapMycoReplay } from '../modules/myco-os/projection/myco-mapper';

describe('Myco OS Mapper Tests', () => {
  it('Correctly filters and maps Myco Observation payloads', () => {
    const mockState = {
      observations: {
        'hash1': {
          type: 'Observation',
          payload: {
            domain: 'myco',
            type: 'field_observation',
            timestamp: '2026-07-01T12:00:00Z',
            data: {
              species_guess: 'Amanita muscaria',
              notes: 'Found near pine tree'
            },
            media: [
              { uri: 's3://bucket/img1', hash: 'abc123hash' }
            ]
          }
        },
        'hash2': {
          type: 'Observation',
          payload: {
            domain: 'anchorsig', // Non-myco domain
            type: 'interruption'
          }
        }
      }
    };

    const mapped = mapMycoReplay(mockState);
    expect(mapped.length).toBe(1);
    expect(mapped[0].eventId).toBe('hash1');
    expect(mapped[0].species).toBe('Amanita muscaria');
    expect(mapped[0].mediaHash).toBe('abc123hash');
  });

  it('Returns empty array for missing or empty state', () => {
    expect(mapMycoReplay(null)).toEqual([]);
    expect(mapMycoReplay({})).toEqual([]);
    expect(mapMycoReplay({ observations: {} })).toEqual([]);
  });
});
