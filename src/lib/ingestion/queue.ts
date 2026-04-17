import { SYSTEM_CONSTANTS } from "../constants";
import { vortexQueueDB } from "../db/client";
import { normalizeTimestamp } from "./normalization";
import { validateSample } from "./validator";
import { createHash } from 'crypto';

import { Clock, defaultClock } from "../engine/clock";

export type SignalID = 'kp_index' | 'seismic_count' | 'solar_flux' | 'hrv';
export type IngestionStatus = 'pending' | 'processed' | 'rejected' | 'missing';

export interface QueueEntry {
  _id: string; // queue::source::ts_norm
  source: SignalID;
  ts_raw: string;      
  ts_norm: number;     
  payload: { value: number | null };
  status: IngestionStatus;
  reason?: string;     
}

function computeIdempotencyKey(source: string, ts_norm: number): string {
    return createHash(SYSTEM_CONSTANTS.HASH_ALGO).update(`${source}||${ts_norm}`).digest('hex');
}

export async function enqueueSample(source: SignalID, ts_raw: string, payload: any, clock: Clock = defaultClock): Promise<void> {
    const now_utc = clock.now();
    let ts_norm, is_drifting;
    
    try {
        const normRes = normalizeTimestamp(ts_raw, now_utc);
        ts_norm = normRes.ts_norm;
        is_drifting = normRes.is_drifting;
    } catch (err: any) {
        console.error("Timestamp format rejection", err);
        return; 
    }

    if (is_drifting) {
        console.warn(`Clock drift > 30s detected for source ${source}. Sample rejected.`);
        const key = computeIdempotencyKey(source, ts_norm);
        await vortexQueueDB.put({
            _id: `queue::${source}::${ts_norm}`,
            source,
            ts_raw,
            ts_norm,
            payload,
            status: 'rejected',
            reason: "Clock drift exceeded 30s tolerance"
        }).catch(e => { if (e.status !== 409) throw e; });
        return;
    }

    const { valid, errors } = validateSample(source, payload);
    
    const key = computeIdempotencyKey(source, ts_norm);
    const sampleId = `sample::${key}`;

    // Deduplication check
    try {
        await vortexQueueDB.get(sampleId);
        // Exists, reject duplicate
        console.warn(`Duplicate sample detected for ${source} at ${ts_norm}`);
        return;
    } catch (e: any) {
        if (e.status !== 404) {
            throw e;
        }
    }

    // Write a marker to ensure deduplication (idempotency)
    try {
        await vortexQueueDB.put({
            _id: sampleId,
            source,
            ts_norm,
            inserted_at: now_utc
        });
    } catch (e: any) {
        if (e.status === 409) {
             console.warn(`Duplicate sample race conflict mapped for ${source} at ${ts_norm}`);
             return;
        }
        throw e;
    }

    const queueId = `queue::${source}::${ts_norm}`;

    const entry: QueueEntry = {
        _id: queueId,
        source,
        ts_raw,
        ts_norm,
        payload: { value: valid ? payload.value : null },
        status: valid ? 'pending' : 'rejected',
        reason: valid ? undefined : JSON.stringify(errors)
    };

    try {
        await vortexQueueDB.put(entry);
    } catch (e: any) {
        if (e.status === 409) return;
        throw e;
    }
}

export async function insertPlaceholder(source: SignalID, ts_norm: number): Promise<void> {
    const queueId = `queue::${source}::${ts_norm}`;

    try {
        await vortexQueueDB.get(queueId);
        // Already exists
        return;
    } catch (e: any) {
        if (e.status !== 404) throw e;
    }

    const entry: QueueEntry = {
        _id: queueId,
        source,
        ts_raw: new Date(ts_norm).toISOString(),
        ts_norm,
        payload: { value: null },
        status: 'missing'
    };
    try {
        await vortexQueueDB.put(entry);
    } catch (e: any) {
        if (e.status === 409) return;
        throw e;
    }
}

export async function handleOutOfOrder(source: SignalID, entry: QueueEntry, last_ts_norm: number): Promise<'accept' | 'reject' | 'buffer'> {
    const delta = entry.ts_norm - last_ts_norm;
    const windowMs = SYSTEM_CONSTANTS.MAX_GAP_INTERVALS * SYSTEM_CONSTANTS.INTERVAL_MS;

    if (delta < -windowMs) {
        return 'reject';
    } else if (delta >= -windowMs && delta <= windowMs) {
        return 'accept';
    } else {
        return 'buffer';
    }
}
