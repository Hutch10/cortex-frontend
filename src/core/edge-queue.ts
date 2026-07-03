import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { appendCommitment, PrimitiveType, AppendPayload } from './cortex-client';

export interface QueuedCommitment {
  id?: number;
  type: PrimitiveType;
  payload: AppendPayload;
  timestamp: number;
}

interface EdgeQueueDB extends DBSchema {
  commitments: {
    key: number;
    value: QueuedCommitment;
    indexes: { 'by-timestamp': number };
  };
}

class EdgeCommitQueue {
  private dbPromise: Promise<IDBPDatabase<EdgeQueueDB>>;
  private isSyncing: boolean = false;
  private nextSyncAllowedTime: number = 0;
  private currentBackoffMs: number = 1000;

  constructor() {
    this.dbPromise = openDB<EdgeQueueDB>('forge-edge-queue', 1, {
      upgrade(db) {
        const store = db.createObjectStore('commitments', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', (e) => {
        if (this.isSyncing) {
          e.preventDefault();
          e.returnValue = 'Data is currently syncing to Cortex. Leaving now may delay upload.';
          return e.returnValue;
        }
      });
    }
  }

  async enqueue(type: PrimitiveType, payload: AppendPayload): Promise<void> {
    const db = await this.dbPromise;
    await db.add('commitments', {
      type,
      payload,
      timestamp: Date.now(),
    });
    
    // Attempt sync immediately, but don't block
    this.sync().catch(console.error);
  }

  async sync(): Promise<void> {
    if (this.isSyncing) return;
    if (Date.now() < this.nextSyncAllowedTime) return;
    this.isSyncing = true;
    
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('commitments', 'readwrite');
      const store = tx.objectStore('commitments');
      const index = store.index('by-timestamp');
      
      let cursor = await index.openCursor();
      
      while (cursor) {
        const item = cursor.value;
        try {
          await appendCommitment(item.type, item.payload);
          await cursor.delete();
          this.currentBackoffMs = 1000; // Reset backoff on success
          this.nextSyncAllowedTime = 0;
        } catch (err) {
          console.error('Sync failed for item', item, err);
          // Exponential backoff
          this.nextSyncAllowedTime = Date.now() + this.currentBackoffMs;
          this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, 60000); // Max 1 min
          // If network error, stop syncing and retain item
          break;
        }
        cursor = await cursor.continue();
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async getQueueStatus(): Promise<{ pendingCount: number }> {
    const db = await this.dbPromise;
    const count = await db.count('commitments');
    return { pendingCount: count };
  }

  async getPendingByDomain(domain: string): Promise<QueuedCommitment[]> {
    const db = await this.dbPromise;
    const all = await db.getAll('commitments');
    return all.filter(c => (c.payload as any).payload?.domain === domain || (c.payload as any).domain === domain);
  }
}

export const edgeQueue = new EdgeCommitQueue();
