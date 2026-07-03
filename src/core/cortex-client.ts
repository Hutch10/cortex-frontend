export type PrimitiveType = 'Observation' | 'Evidence' | 'Claim' | 'Decision';

export interface AppendPayload {
  actor_id: string;
  payload: Record<string, any>;
  parent_ids?: string[];
  signature: string;
}

const CORTEX_API_BASE = process.env.NEXT_PUBLIC_CORTEX_API_URL || 'http://localhost:8000/api/v1/core';

export async function appendCommitment(type: PrimitiveType, data: AppendPayload) {
  const url = `${CORTEX_API_BASE}/append/${type.toLowerCase()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        ...data,
        parent_ids: data.parent_ids || []
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function readReplay() {
  const response = await fetch(`${CORTEX_API_BASE}/replay`);
  if (!response.ok) throw new Error('Failed to fetch replay');
  return response.json();
}

export async function readIntegrity() {
  const response = await fetch(`${CORTEX_API_BASE}/integrity`);
  if (!response.ok) throw new Error('Failed to fetch integrity status');
  return response.json();
}

export async function readSnapshot(moduleName: string, projectionName: string) {
  const response = await fetch(`${CORTEX_API_BASE}/snapshots/${moduleName}/${projectionName}/latest`);
  if (!response.ok) throw new Error('Failed to fetch snapshot');
  return response.json();
}
