import { LedgerEntry } from "./chain";
import { getQuarantineDB, getPulseLedgerDB } from "../db/client";

export interface QuarantineEntry extends LedgerEntry {
    reason: 'hash_mismatch' | 'tamper_detected';
    original_hash: string;
    segment_id: number;
}

export interface SegmentAnchor {
    _id: `segment_anchor::${number}`;
    hash_of_last_valid: string;
    start_ts: string;
    end_ts: string;
}

// Simple sequence generator for standardizing segment IDs
let currentSegmentId = 1;

export function nextSegmentId(): number {
    return currentSegmentId++;
}

export async function quarantineEntry(
    failedEntry: LedgerEntry, 
    reason: 'hash_mismatch' | 'tamper_detected', 
    storedHash: string
): Promise<QuarantineEntry> {
    const seg_id = nextSegmentId();
    
    const quarantined: any = {
        ...failedEntry,
        _id: `quarantine::${seg_id}::${failedEntry._id.split('::')[1]}`,
        status: 'invalid',
        reason,
        original_hash: storedHash,
        segment_id: seg_id
    };

    delete quarantined._rev;

    const db = getQuarantineDB();
    await db.put(quarantined);
    return quarantined;
}

export async function createSegmentAnchor(
    segment_id: number, 
    hash_of_last_valid: string, 
    start_ts: string, 
    end_ts: string
): Promise<SegmentAnchor> {
    const anchor: SegmentAnchor = {
        _id: `segment_anchor::${segment_id}`,
        hash_of_last_valid,
        start_ts,
        end_ts
    };

    const db = getPulseLedgerDB();
    await db.put(anchor);
    return anchor;
}
