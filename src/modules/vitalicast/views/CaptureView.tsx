import React, { useEffect, useState } from 'react';
import { VitalicastHealthKit, HealthKitAuthResult } from '../HealthKitBridge';

export const CaptureView: React.FC = () => {
  const [isNative, setIsNative] = useState(false);
  const [bridgeAvailable, setBridgeAvailable] = useState(false);
  const [authStatus, setAuthStatus] = useState<HealthKitAuthResult['status']>('PENDING');

  useEffect(() => {
    // Check if running inside Capacitor
    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
    setIsNative(isCapacitor);
    
    // The bridge is mock-available currently
    setBridgeAvailable(!!VitalicastHealthKit);

    // Initial status fetch
    VitalicastHealthKit.getAuthorizationStatus().then(res => {
      setAuthStatus(res.status);
    });
  }, []);

  const handleConnect = async () => {
    const res = await VitalicastHealthKit.requestAuthorization({ types: ['heartRate'] });
    setAuthStatus(res.status);
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Vitalicast Capture</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h2>Apple Health Connection</h2>
        <p>Status: <strong>{authStatus}</strong></p>
        <button 
          onClick={handleConnect}
          style={{ padding: '8px 16px', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Connect Apple Health (Placeholder)
        </button>
      </div>

      <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
        <h3>System Diagnostics</h3>
        <ul>
          <li><strong>Native Shell Loaded:</strong> {isNative ? 'Yes' : 'No'}</li>
          <li><strong>Native Bridge Available:</strong> {bridgeAvailable ? 'Yes' : 'No'}</li>
          <li><strong>HealthKit Permission State:</strong> {authStatus}</li>
          <li><strong>Last Native Sync:</strong> NEVER</li>
        </ul>
      </div>
    </div>
  );
};
