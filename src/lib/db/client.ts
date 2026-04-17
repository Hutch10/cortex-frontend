import PouchDB from 'pouchdb';

// Ensure singleton instances for reliable event listening and conflict avoidance

let vortexQueueDB: PouchDB.Database;
let pulseLedgerDB: PouchDB.Database;
let quarantineDB: PouchDB.Database;

if (typeof window !== 'undefined') {
  vortexQueueDB = new PouchDB('vortex_queue');
  pulseLedgerDB = new PouchDB('pulse_ledger');
  quarantineDB = new PouchDB('quarantine');
} else {
  // If running in Node, we might want memory or file based. For NextJS server actions/API routes:
  // (Assuming we use a local dir or memory for server-side testing, else just rely on fetch from API)
  const PouchMemory = require('pouchdb-adapter-memory');
  PouchDB.plugin(PouchMemory);
  vortexQueueDB = new PouchDB('SERVER_vortex_queue', { adapter: 'memory' });
  pulseLedgerDB = new PouchDB('SERVER_pulse_ledger', { adapter: 'memory' });
  quarantineDB = new PouchDB('SERVER_quarantine', { adapter: 'memory' });
}

export { vortexQueueDB, pulseLedgerDB, quarantineDB };
