import { LedgerEntry, verifyLedgerEntry } from "../ledger/chain";
import { ComputationResult } from "./window";
import { SignalID } from "../ingestion/queue";
import { SnapshotModel, verifySnapshot, deterministicDeserializeState } from "./snapshot";
export interface SystemStateSnapshot {
    signals: Map<SignalID, ComputationResult>;
    chain_height: number;
    last_hash: string;
}

/**
 * Reconstructs the full operational state of the Cortex engine 
 * solely from a historical sequence of signed ledger entries.
 * 
 * FAIL-FAST: This function enforces hash chain continuity and 
 * cryptographic signature integrity for every entry.
 */
export async function reconstructState(ledgerEntries: LedgerEntry[]): Promise<SystemStateSnapshot> {
    const signals = new Map<SignalID, ComputationResult>();
    
    // Sort by timestamp to ensure chronological reconstruction
    const sortedEntries = [...ledgerEntries].sort((a, b) => a.payload.ts_norm - b.payload.ts_norm);
    
    let lastHash = "GENESIS_HASH";
    let height = 0;

    for (const entry of sortedEntries) {
        // 1. Verify Entry Integrity (Hash + Signature)
        const isValid = await verifyLedgerEntry(entry);
        if (!isValid) {
            throw new Error(`CRITICAL_DISCONTINUITY: Cryptographic verification failed for entry at ts=${entry.payload.ts_norm}. Forensic Trace: ${entry.trace_id}`);
        }

        // 2. Verify Chain Continuity (prev_hash link)
        if (entry.prev_hash !== lastHash) {
            throw new Error(`CRITICAL_DISCONTINUITY: Hash chain broken at ts=${entry.payload.ts_norm}. Expected prev_hash ${lastHash}, found ${entry.prev_hash}`);
        }

        // 3. Detect Forks/Duplicates
        if (signals.has(entry.payload.signal_id) && signals.get(entry.payload.signal_id)!.ts_norm === entry.payload.ts_norm) {
             throw new Error(`CRITICAL_DISCONTINUITY: Multiple conflicting entries found for ${entry.payload.signal_id} at ts=${entry.payload.ts_norm}. Potential Ledger Fork.`);
        }

        // 4. Update State
        signals.set(entry.payload.signal_id, entry.payload);
        lastHash = entry.hash;
        height++;
    }

    return {
        signals,
        chain_height: height,
        last_hash: lastHash
    };
}

export async function reconstructFromSnapshot(snapshot: SnapshotModel, deltaEntries: LedgerEntry[]): Promise<SystemStateSnapshot> {
    // 1. Verify snapshot integrity
    verifySnapshot(snapshot);
    
    // 2. Deserialize state
    const state = deterministicDeserializeState(snapshot.serialized_state);
    
    // 3. Replay delta
    const sortedEntries = [...deltaEntries].sort((a, b) => a.payload.ts_norm - b.payload.ts_norm);
    
    let lastHash = state.last_hash;
    let height = state.chain_height;
    const signals = state.signals;

    for (const entry of sortedEntries) {
        const isValid = await verifyLedgerEntry(entry);
        if (!isValid) {
            throw new Error(`CRITICAL_DISCONTINUITY: Cryptographic verification failed for entry at ts=${entry.payload.ts_norm}. Forensic Trace: ${entry.trace_id}`);
        }

        if (entry.prev_hash !== lastHash) {
            throw new Error(`CRITICAL_DISCONTINUITY: Hash chain broken at ts=${entry.payload.ts_norm}. Expected prev_hash ${lastHash}, found ${entry.prev_hash}`);
        }

        if (signals.has(entry.payload.signal_id) && signals.get(entry.payload.signal_id)!.ts_norm === entry.payload.ts_norm) {
             throw new Error(`CRITICAL_DISCONTINUITY: Multiple conflicting entries found for ${entry.payload.signal_id} at ts=${entry.payload.ts_norm}. Potential Ledger Fork.`);
        }

        signals.set(entry.payload.signal_id, entry.payload);
        lastHash = entry.hash;
        height++;
    }

    return { signals, chain_height: height, last_hash: lastHash };
}
