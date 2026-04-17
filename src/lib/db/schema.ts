import { vortexQueueDB, pulseLedgerDB, quarantineDB } from "./client";

export async function initializeDatabases() {
    try {
        // Queue Index: by status and timestamp
        await vortexQueueDB.createIndex({
            index: {
                fields: ['status', 'ts_norm']
            }
        });

        // Ledger Index: by timestamp
        await pulseLedgerDB.createIndex({
            index: {
                fields: ['payload.ts_norm']
            }
        });

        console.log("PouchDB indexes initialized or already exist.");
    } catch (err) {
        console.error("Error initializing PouchDB indexes:", err);
    }
}
