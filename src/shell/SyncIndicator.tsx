'use client';

import React, { useEffect, useState } from 'react';
import { edgeQueue } from '../core/edge-queue';

export function SyncIndicator() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const checkQueue = async () => {
      const status = await edgeQueue.getQueueStatus();
      setPending(status.pendingCount);
    };

    const interval = setInterval(checkQueue, 2000);
    checkQueue();
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', margin: '8px' }}>
      <strong>Edge Queue:</strong> {pending === 0 ? '✅ Synced' : `⚠️ ${pending} Pending Sync`}
      {pending > 0 && (
        <button onClick={() => edgeQueue.sync()} style={{ marginLeft: '8px' }}>
          Sync Now
        </button>
      )}
    </div>
  );
}
