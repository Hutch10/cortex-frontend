import PouchDB from 'pouchdb';

let _vortexQueueDB: PouchDB.Database | null = null;
let _pulseLedgerDB: PouchDB.Database | null = null;
let _quarantineDB: PouchDB.Database | null = null;

function initDB(name: string, serverName: string) {
    if (typeof window !== 'undefined') {
        return new PouchDB(name);
    } else {
        const dbPath = process.env.VORTEX_DB_DIR || null;
        if (dbPath) {
            return new PouchDB(`${dbPath}/${name}`);
        } else {
            const PouchMemory = require('pouchdb-adapter-memory');
            PouchDB.plugin(PouchMemory);
            return new PouchDB(serverName, { adapter: 'memory' });
        }
    }
}

export function getVortexQueueDB() {
    if (!_vortexQueueDB || (_vortexQueueDB as any)._closed) {
        _vortexQueueDB = initDB('vortex_queue', 'SERVER_vortex_queue');
    }
    return _vortexQueueDB;
}

export function getPulseLedgerDB() {
    if (!_pulseLedgerDB || (_pulseLedgerDB as any)._closed) {
        _pulseLedgerDB = initDB('pulse_ledger', 'SERVER_pulse_ledger');
    }
    return _pulseLedgerDB;
}

export function getQuarantineDB() {
    if (!_quarantineDB || (_quarantineDB as any)._closed) {
        _quarantineDB = initDB('quarantine', 'SERVER_quarantine');
    }
    return _quarantineDB;
}

export async function closeDBs() {
    if (_vortexQueueDB) {
        await _vortexQueueDB.close();
        _vortexQueueDB = null;
    }
    if (_pulseLedgerDB) {
        await _pulseLedgerDB.close();
        _pulseLedgerDB = null;
    }
    if (_quarantineDB) {
        await _quarantineDB.close();
        _quarantineDB = null;
    }
}
