import { enqueueSample } from "../../src/lib/ingestion/queue";
import { processWindow, ComputationResult } from "../../src/lib/engine/window";
import { createLedgerEntry } from "../../src/lib/ledger/chain";
import { getVortexQueueDB, getPulseLedgerDB   } from '../../src/lib/db/client';
import { reconstructState } from "../../src/lib/engine/replay";
import { DeterministicTestClock } from "../../src/lib/engine/clock";

describe("Ledger Replay Certification: Bit-for-Bit State Reconstruction", () => {
    beforeEach(async () => {
        try {
            const pulseLedgerDB = getPulseLedgerDB();
            const vortexQueueDB = getVortexQueueDB();
            let all = await getPulseLedgerDB().allDocs({include_docs: true});
            for (let row of all.rows) await getPulseLedgerDB().remove(row.doc as any);
            all = await getVortexQueueDB().allDocs({include_docs: true});
            for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);
        } catch (e: any) {}
    });

    it("reconstructs identical state from ledger history (Phase 4.3)", async () => {
        const source = 'seismic_count';
        const startTs = 1776458400000;
        let last_hash = "GENESIS_HASH";
        
        const liveResults: ComputationResult[] = [];
        const windowValues: number[] = [];

        // 1. Live Ingestion & Processing
        for (let i = 0; i < 20; i++) {
            const tsNow = startTs + i * 60000;
            const clock = new DeterministicTestClock(tsNow);
            const tsRaw = new Date(tsNow).toISOString();
            const val = 10 + (i === 15 ? 50 : 0); // Outlier at 15
            
            const { trace_id } = await enqueueSample(source, tsRaw, { value: val }, clock);
            
            // Simulation of orchestration loop
            windowValues.push(val);
            const comp = processWindow(source, tsNow, tsNow, [...windowValues], 15) as ComputationResult;
            liveResults.push(comp);

            const ledgerEntry = await createLedgerEntry(comp, last_hash, trace_id);
            const db = getPulseLedgerDB();
            await db.put(ledgerEntry);
            last_hash = ledgerEntry.hash;
        }

        // 2. Replay Reconstruction
        const dbP = getPulseLedgerDB();
        const allLedger = await dbP.allDocs({include_docs: true});
        const entries = allLedger.rows.map((r: any) => r.doc as any);
        
        const replayedState = await reconstructState(entries);

        // 3. Bit-for-Bit Verification
        const finalLive = liveResults[liveResults.length - 1];
        const finalReplayed = replayedState.signals.get(source);

        expect(finalReplayed).toBeDefined();
        expect(finalReplayed!.ts_norm).toBe(finalLive.ts_norm);
        expect(finalReplayed!.baseline.robust_center).toBe(finalLive.baseline.robust_center);
        expect(finalReplayed!.baseline.robust_sigma).toBe(finalLive.baseline.robust_sigma);
        expect(finalReplayed!.confidence).toBe(finalLive.confidence);
        expect(finalReplayed!.anomaly_flag).toBe(finalLive.anomaly_flag);
        
        // Final chain integrity check
        expect(replayedState.chain_height).toBe(20);
        expect(replayedState.last_hash).toBe(last_hash);
    });
});
