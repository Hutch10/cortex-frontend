import { useState, useEffect } from 'react';
import { edgeQueue, QueuedCommitment } from './edge-queue';

export function useEdgeQueue(domain: string) {
  const [pendingItems, setPendingItems] = useState<QueuedCommitment[]>([]);

  useEffect(() => {
    let mounted = true;
    
    const fetchPending = async () => {
      try {
        const items = await edgeQueue.getPendingByDomain(domain);
        if (mounted) {
          setPendingItems(items);
        }
      } catch (err) {
        console.error('Failed to fetch pending queue items', err);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [domain]);

  return pendingItems;
}
