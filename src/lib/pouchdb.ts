/**
 * TerraPulse Second Brain: PouchDB Local-First Architecture
 * Replicates the robust sync and integrity patterns from GrowKeeper.
 */

// Local Database Instances
const isBrowser = typeof window !== 'undefined';

function getPouchDB() {
    if (!isBrowser) return null;
    let PouchDB = require('pouchdb-browser');
    if (PouchDB.default) PouchDB = PouchDB.default;
    let PouchDBFind = require('pouchdb-find');
    if (PouchDBFind.default) PouchDBFind = PouchDBFind.default;
    PouchDB.plugin(PouchDBFind);
    return PouchDB;
}

const PouchDBInstance = getPouchDB();

function createSafeDB<T extends object>(name: string) {
    if (!isBrowser || !PouchDBInstance) {
        return {
            info: () => Promise.resolve({ doc_count: 0 }),
            put: () => Promise.resolve(),
            get: () => Promise.resolve({} as any),
            allDocs: () => Promise.resolve({ rows: [] }),
            createIndex: () => Promise.resolve(),
        } as any;
    }
    return new PouchDBInstance(name);
}

// Memory Databases (The Second Brain)
export const astronomyNotesDB = createSafeDB('terrapulse_astronomy');
export const marineNotesDB = createSafeDB('terrapulse_marine');
export const geologyNotesDB = createSafeDB('terrapulse_geology');
export const resonanceMemoryDB = createSafeDB('terrapulse_resonance_memory');

export interface ResonanceEntry {
    _id: string; // ISO Timestamp
    kp_index: number;
    seismic_count: number;
    user_mood?: string;
    hrv_score?: number;
    notes?: string;
    integrity_seal: string; // Cryptographic seal for data non-repudiation
}

export async function initTerraPulseMemory() {
    if (!isBrowser) return;
    
    await resonanceMemoryDB.createIndex({
        index: { fields: ['kp_index', 'hrv_score'] }
    });
}
