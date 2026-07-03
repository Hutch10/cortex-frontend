import { isMycoObservation, MycoObservationPayload } from '../schema';

export interface MappedMycoEvent {
  eventId: string;
  timestamp: string;
  species: string;
  notes: string;
  mediaHash?: string;
}

export function mapMycoReplay(rawState: any): MappedMycoEvent[] {
  if (!rawState || !rawState.observations) {
    return [];
  }

  const events: MappedMycoEvent[] = [];

  // Assuming rawState.observations is a dict of id -> payload
  for (const [id, observation] of Object.entries(rawState.observations) as [string, any][]) {
    if (isMycoObservation(observation.payload)) {
      const mycoData = observation.payload as MycoObservationPayload;
      
      events.push({
        eventId: id,
        timestamp: mycoData.timestamp,
        species: mycoData.data.species_guess || 'Unknown',
        notes: mycoData.data.notes || '',
        mediaHash: mycoData.media && mycoData.media.length > 0 ? mycoData.media[0].hash : undefined
      });
    }
  }

  // Sort by timestamp descending
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
