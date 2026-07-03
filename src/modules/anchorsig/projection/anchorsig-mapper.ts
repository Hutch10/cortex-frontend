import { isAnchorSigPayload, AnchorSigPayload } from '../schema';

export interface MappedAnchorSigEvent {
  eventId: string;
  timestamp: string;
  assetId: string;
  location: string;
  status: string;
  notes: string;
  mediaHash?: string;
}

export function mapAnchorSigReplay(rawState: any): MappedAnchorSigEvent[] {
  if (!rawState || !rawState.observations) {
    return [];
  }

  const events: MappedAnchorSigEvent[] = [];

  for (const [id, observation] of Object.entries(rawState.observations) as [string, any][]) {
    if (isAnchorSigPayload(observation.payload)) {
      const data = observation.payload as AnchorSigPayload;
      
      events.push({
        eventId: id,
        timestamp: data.timestamp,
        assetId: data.data.asset_id,
        location: data.data.location,
        status: data.data.status,
        notes: data.data.notes || '',
        mediaHash: data.media && data.media.length > 0 ? data.media[0].hash : undefined
      });
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
