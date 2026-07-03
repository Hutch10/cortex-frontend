import { createHash } from "crypto";
import { SYSTEM_CONSTANTS } from "../constants";
import { ComputationResult } from "../engine/window";
import { signPayload, verifySignature } from "./audit";
import { getQuarantineDB, getPulseLedgerDB } from "../db/client";

export interface LedgerEntry {
  _id: string;
  prev_hash: string;
  hash: string;
  payload: ComputationResult;
  signature: string;
  status: 'valid' | 'invalid';
  trace_id: string;   // Trace of the attempt that generated this result
}

export function computeChainHash(prev_hash: string, payload: any, signature: string): string {
    // trace_id is explicitly EXCLUDED here to maintain identity-observability separation
    return createHash(SYSTEM_CONSTANTS.HASH_ALGO)
        .update(prev_hash + JSON.stringify(payload) + signature)
        .digest('hex');
}

export async function createLedgerEntry(
    payload: ComputationResult, 
    last_valid_hash: string,
    trace_id: string
): Promise<LedgerEntry> {
    const signature = await signPayload(JSON.stringify(payload));
    const hash = computeChainHash(last_valid_hash, payload, signature);

    const entry: LedgerEntry = {
        _id: `ledger::${payload.ts_norm}`,
        prev_hash: last_valid_hash,
        hash,
        payload,
        signature,
        status: 'valid',
        trace_id
    };

    return entry;
}

export async function verifyLedgerEntry(entry: LedgerEntry): Promise<boolean> {
    if (entry.status !== 'valid') return false;

    // 1. Verify signature
    const isValidSig = await verifySignature(JSON.stringify(entry.payload), entry.signature);
    if (!isValidSig) return false;

    // 2. Verify hash
    const recomputedHash = computeChainHash(entry.prev_hash, entry.payload, entry.signature);
    return recomputedHash === entry.hash;
}
