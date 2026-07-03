'use client';
import React, { useState } from 'react';
import { SyncIndicator } from './SyncIndicator';
import { IntegrityBadge } from './IntegrityBadge';

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const [sunlightMode, setSunlightMode] = useState(false);

  const containerStyle = sunlightMode 
    ? { backgroundColor: '#ffffff', color: '#000000' }
    : { backgroundColor: '#f9f9f9', color: 'inherit' };
    
  const headerStyle = sunlightMode 
    ? { backgroundColor: '#000000', color: '#ffffff', padding: '0 16px', display: 'flex', alignItems: 'center' }
    : { backgroundColor: '#333', color: 'white', padding: '0 16px', display: 'flex', alignItems: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'sans-serif', ...containerStyle }}>
      <header style={headerStyle}>
        <h1 style={{ flex: 1, margin: 0, padding: '16px 0', fontSize: '18px' }}>Forge Runtime v0.1</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setSunlightMode(!sunlightMode)}
            style={{ padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold' }}
            aria-label="Toggle Sunlight Mode"
          >
            {sunlightMode ? '☀️ High Contrast' : '🕶️ Normal'}
          </button>
          <SyncIndicator />
          <IntegrityBadge />
        </div>
      </header>
      
      <main style={{ flex: 1, ...containerStyle }}>
        {children}
      </main>
      
      <footer style={{ padding: '8px', textAlign: 'center', fontSize: '12px', ...(sunlightMode ? { borderTop: '2px solid #000' } : { backgroundColor: '#eee' }) }}>
        HutchStack / Cortex Embedded Shell
      </footer>
    </div>
  );
}
