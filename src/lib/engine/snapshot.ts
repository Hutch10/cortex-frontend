import { createHash } from "crypto";
import { SYSTEM_CONSTANTS } from "../constants";
import { ComputationResult } from "./window";
import { SystemStateSnapshot } from "./replay";
import { LedgerEntry } from "../ledger/chain";

export interface SnapshotModel {
    _id: string; // snapshot::timestamp
    sequence_number: number;
    state_hash: string;
    snapshot_hash: string;
    previous_snapshot_hash: string;
    created_at: number;
    serialized_state: string; // JSON of array of tuples
}

export interface RollupEvent {
    _id: string;
    source_count: number;
    time_range_start: number;
    time_range_end: number;
    min: number;
    max: number;
    avg: number;
    raw_data_hash: string; // Merkle root of raw events
    created_at: number;
}

export function deterministicSerializeState(state: SystemStateSnapshot): string {
    // Canonicalize Map by sorting keys
    const sortedEntries = Array.from(state.signals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const obj = {
        signals: sortedEntries,
        chain_height: state.chain_height,
        last_hash: state.last_hash
    };
    return JSON.stringify(obj);
}

export function deterministicDeserializeState(serialized: string): SystemStateSnapshot {
    const obj = JSON.parse(serialized);
    return {
        signals: new Map(obj.signals),
        chain_height: obj.chain_height,
        last_hash: obj.last_hash
    };
}

export function computeStateHash(serializedState: string): string {
    return createHash(SYSTEM_CONSTANTS.HASH_ALGO).update(serializedState).digest("hex");
}

export function computeSnapshotHash(stateHash: string, prevHash: string, seqNum: number): string {
    return createHash(SYSTEM_CONSTANTS.HASH_ALGO).update(stateHash + prevHash + seqNum).digest("hex");
}

export function createSnapshot(state: SystemStateSnapshot, seqNum: number, prevSnapshotHash: string): SnapshotModel {
    const serialized_state = deterministicSerializeState(state);
    const state_hash = computeStateHash(serialized_state);
    const snapshot_hash = computeSnapshotHash(state_hash, prevSnapshotHash, seqNum);
    
    return {
        _id: `snapshot::${Date.now()}`,
        sequence_number: seqNum,
        state_hash,
        snapshot_hash,
        previous_snapshot_hash: prevSnapshotHash,
        created_at: Date.now(),
        serialized_state
    };
}

export function verifySnapshot(snapshot: SnapshotModel): void {
    const expectedStateHash = computeStateHash(snapshot.serialized_state);
    if (expectedStateHash !== snapshot.state_hash) {
        throw new Error("CORRUPT_SNAPSHOT: state_hash does not match serialized_state");
    }
    
    const expectedSnapshotHash = computeSnapshotHash(snapshot.state_hash, snapshot.previous_snapshot_hash, snapshot.sequence_number);
    if (expectedSnapshotHash !== snapshot.snapshot_hash) {
        throw new Error("CORRUPT_SNAPSHOT: snapshot_hash is invalid");
    }
}

export function computeMerkleRoot(events: LedgerEntry[]): string {
    if (events.length === 0) return "EMPTY";
    let hashes = events.map(e => e.hash);
    while (hashes.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = (i + 1 < hashes.length) ? hashes[i + 1] : left;
            nextLevel.push(createHash(SYSTEM_CONSTANTS.HASH_ALGO).update(left + right).digest("hex"));
        }
        hashes = nextLevel;
    }
    return hashes[0];
}

export function createRollupEvent(events: LedgerEntry[]): RollupEvent {
    if (events.length === 0) throw new Error("Cannot rollup empty events");
    
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    
    const sorted = [...events].sort((a, b) => a.payload.ts_norm - b.payload.ts_norm);
    const time_range_start = sorted[0].payload.ts_norm;
    const time_range_end = sorted[sorted.length - 1].payload.ts_norm;
    
    for (const entry of sorted) {
        // Assume single value array for proof
        const val = entry.payload.deviation?.value || 0; 
        if (val < min) min = val;
        if (val > max) max = val;
        sum += val;
    }
    
    return {
        _id: `rollup::${time_range_end}`,
        source_count: events.length,
        time_range_start,
        time_range_end,
        min,
        max,
        avg: sum / events.length,
        raw_data_hash: computeMerkleRoot(sorted),
        created_at: Date.now()
    };
}
