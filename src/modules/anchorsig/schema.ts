export interface AnchorSigPayload {
  domain: 'anchorsig';
  type: 'continuity_log';
  timestamp: string;
  data: {
    asset_id: string;
    location: string;
    status: string;
    notes?: string;
  };
  media?: Array<{
    uri: string;
    hash: string;
    mime_type: string;
  }>;
}

export function isAnchorSigPayload(payload: any): payload is AnchorSigPayload {
  return payload?.domain === 'anchorsig' && payload?.type === 'continuity_log';
}
