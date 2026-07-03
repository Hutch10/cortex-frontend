export interface MycoObservationPayload {
  domain: 'myco';
  type: 'field_observation';
  timestamp: string;
  data: {
    species_guess?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  };
  media: {
    uri: string;
    hash: string; // SHA-256
    mime_type: string;
  }[];
}

export function isMycoObservation(payload: any): payload is MycoObservationPayload {
  return payload && payload.domain === 'myco' && payload.type === 'field_observation';
}
