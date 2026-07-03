'use client';

import React, { useEffect, useState } from 'react';
import { readReplay } from '../core/cortex-client';

export function ProjectionViewer() {
  const [state, setState] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReplay = async () => {
      try {
        const data = await readReplay();
        setState(data.state);
        setTimeline(data.timeline);
      } catch (err: any) {
        setError(err.message);
      }
    };
    loadReplay();
  }, []);

  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!state) return <div>Loading Projection...</div>;

  return (
    <div style={{ padding: '16px' }}>
      <h2>Generic Projection Viewer</h2>
      <p><em>Note: This is a fallback view rendering raw Cortex Replay State. No domain logic applied.</em></p>
      
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, border: '1px solid #ddd', padding: '8px' }}>
          <h3>Reconstructed State</h3>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
        
        <div style={{ flex: 1, border: '1px solid #ddd', padding: '8px' }}>
          <h3>Raw Timeline</h3>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(timeline, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
