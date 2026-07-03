import { SnapshotModel } from "./snapshot";
import { LedgerEntry } from "../ledger/chain";
import { reconstructFromSnapshot, SystemStateSnapshot } from "./replay";

export interface OrchestrationResult {
    state: SystemStateSnapshot;
    certification: {
        fallback_used: boolean;
        rejected_snapshot_id?: string;
        fallback_snapshot_id?: string;
        reason?: string;
    };
}

export async function bootWithFallback(
    latestSnapshot: SnapshotModel, 
    fallbackSnapshot: SnapshotModel, 
    latestDelta: LedgerEntry[],
    fallbackDelta: LedgerEntry[] // Delta from fallback to now
): Promise<OrchestrationResult> {
    try {
        const state = await reconstructFromSnapshot(latestSnapshot, latestDelta);
        return {
            state,
            certification: { fallback_used: false }
        };
    } catch (error: any) {
        if (error.message.includes("CORRUPT_SNAPSHOT")) {
            const state = await reconstructFromSnapshot(fallbackSnapshot, fallbackDelta);
            return {
                state,
                certification: {
                    fallback_used: true,
                    rejected_snapshot_id: latestSnapshot._id,
                    fallback_snapshot_id: fallbackSnapshot._id,
                    reason: error.message
                }
            };
        }
        throw error;
    }
}
