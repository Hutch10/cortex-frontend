import { getVortexQueueDB, getPulseLedgerDB, getQuarantineDB } from "./client";

export async function initializeDatabases() {
    try {
        // Queue Index: by status and timestamp
        await getVortexQueueDB().createIndex({
            index: {
                fields: ['status', 'ts_norm']
            }
        });

        // Ledger Index: by timestamp
        await getPulseLedgerDB().createIndex({
            index: {
                fields: ['payload.ts_norm']
            }
        });

        console.log("PouchDB indexes initialized or already exist.");
    } catch (err) {
        console.error("Error initializing PouchDB indexes:", err);
    }
}
