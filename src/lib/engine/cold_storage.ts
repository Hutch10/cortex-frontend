import { LedgerEntry } from "../ledger/chain";
import { computeMerkleRoot } from "./snapshot";

export interface ColdStorageBlob {
    blob_id: string;
    encrypted_data: string; // Serialized JSON of raw events
    hash: string;
}

export function dehydrateEvents(events: LedgerEntry[]): ColdStorageBlob {
    // Stub: Serialize without actual encryption for proof harness
    const serialized = JSON.stringify(events);
    const hash = computeMerkleRoot(events);
    return {
        blob_id: `blob::${Date.now()}`,
        encrypted_data: serialized,
        hash
    };
}

import { computeChainHash } from "../ledger/chain";

export function hydrateEvents(blob: ColdStorageBlob, expectedAnchorHash: string): LedgerEntry[] {
    const events: LedgerEntry[] = JSON.parse(blob.encrypted_data);
    
    for (const e of events) {
        const h = computeChainHash(e.prev_hash, e.payload, e.signature);
        if (h !== e.hash) throw new Error("CORRUPT_ARCHIVE: internal entry hash mismatch");
    }
    
    const recomputedHash = computeMerkleRoot(events);
    
    if (recomputedHash !== expectedAnchorHash || blob.hash !== expectedAnchorHash) {
        throw new Error("CORRUPT_ARCHIVE: blob hash does not match expected anchored hash");
    }
    
    return events;
}
