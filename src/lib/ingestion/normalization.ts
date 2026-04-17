import { SYSTEM_CONSTANTS } from "../constants";

export function normalizeTimestamp(ts_raw: string, now_utc_ms: number): { ts_norm: number, is_drifting: boolean } {
    const parsed = Date.parse(ts_raw);
    if (isNaN(parsed)) {
        throw new Error(`Invalid timestamp format: ${ts_raw}`);
    }

    const drift = now_utc_ms - parsed;
    
    // Check if absolute drift > 30s
    const is_drifting = Math.abs(drift) > 30000;

    // Millisecond aligned to the minute
    const ts_norm = Math.floor(parsed / SYSTEM_CONSTANTS.INTERVAL_MS) * SYSTEM_CONSTANTS.INTERVAL_MS;

    return { ts_norm, is_drifting };
}
