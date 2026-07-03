'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { readReplay } from '../../../core/cortex-client';
import { mapMycoReplay, MappedMycoEvent } from '../projection/myco-mapper';
import { useEdgeQueue } from '../../../core/use-edge-queue';

export function ReplayView() {
  const [events, setEvents] = useState<MappedMycoEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const pendingItems = useEdgeQueue('myco');

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const data = await readReplay();
      const mapped = mapMycoReplay(data.state);
      setEvents(mapped);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>Myco OS</h2>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <Link href="/myco-os/capture" style={{ textDecoration: 'none', color: '#333' }}>Capture</Link>
          <Link href="/myco-os/replay" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#0070f3' }}>Timeline</Link>
        </nav>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Verified Timeline</h3>
        <button 
          onClick={fetchTimeline} 
          disabled={loading}
          style={{ 
            padding: '8px 16px', 
            minHeight: '44px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: '#eee',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
          aria-label="Refresh Timeline"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          Error: {error}
        </div>
      )}
      
      {!loading && events.length === 0 && pendingItems.length === 0 && !error && (
        <p style={{ fontStyle: 'italic', color: '#666' }}>No Myco field observations found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} role="feed" aria-label="Observation Timeline">
        
        {/* Optimistic Pending Items */}
        {pendingItems.map(item => {
          const payload = (item.payload as any).payload?.data || (item.payload as any).data;
          const species = payload?.species_guess || 'Unknown';
          const notes = payload?.notes || '';
          
          return (
            <article key={`pending-${item.id}`} style={{ border: '1px dashed #aaa', padding: '16px', borderRadius: '8px', backgroundColor: '#fafafa', opacity: 0.8 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '18px' }}>{species} <span style={{fontSize: '12px', backgroundColor: '#e2e3e5', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px'}}>Pending Sync</span></h4>
              <div style={{ fontSize: '13px', color: '#888', margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span><strong style={{ color: '#666' }}>Queued:</strong> {new Date(item.timestamp).toLocaleString()}</span>
              </div>
              {notes && <p style={{ margin: '0 0 12px 0', lineHeight: '1.4', color: '#555' }}>{notes}</p>}
            </article>
          );
        })}

        {/* Verified Items */}
        {events.map(event => (
          <article key={event.eventId} style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2c7a2c', fontSize: '18px' }}>{event.species}</h4>
            <div style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span><strong style={{ color: '#444' }}>Recorded:</strong> {new Date(event.timestamp).toLocaleString()}</span>
              <span><strong style={{ color: '#444' }}>Event ID:</strong> <span style={{ fontFamily: 'monospace' }}>{event.eventId.slice(0, 12)}...</span></span>
            </div>
            {event.notes && <p style={{ margin: '0 0 12px 0', lineHeight: '1.4' }}>{event.notes}</p>}
            {event.mediaHash && (
              <div style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #ccc' }} aria-label="Media Hash">
                📸 <strong>SHA-256:</strong> <code style={{ wordBreak: 'break-all' }}>{event.mediaHash}</code>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
