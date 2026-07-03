'use client';

import React, { useEffect, useState } from 'react';
import { readIntegrity } from '../core/cortex-client';

export function IntegrityBadge() {
  const [status, setStatus] = useState<'LOADING' | 'VALID' | 'INVALID'>('LOADING');

  useEffect(() => {
    const checkIntegrity = async () => {
      try {
        const res = await readIntegrity();
        if (res.valid) {
          setStatus('VALID');
        } else {
          setStatus('INVALID');
        }
      } catch (err) {
        setStatus('INVALID');
      }
    };
    
    checkIntegrity();
    const interval = setInterval(checkIntegrity, 30000);
    return () => clearInterval(interval);
  }, []);

  const badgeStyle = {
    padding: '8px', 
    border: '1px solid #ccc', 
    borderRadius: '4px', 
    margin: '8px',
    backgroundColor: status === 'VALID' ? '#e6ffe6' : (status === 'INVALID' ? '#ffe6e6' : '#f0f0f0')
  };

  return (
    <div style={badgeStyle}>
      <strong>Cortex Integrity:</strong> {status}
    </div>
  );
}
