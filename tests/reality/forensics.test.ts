import { describe, it, expect, beforeEach } from 'vitest';
import { enqueueSample } from '../../src/lib/ingestion/queue';
import { getVortexQueueDB, getPulseLedgerDB, closeDBs   } from '../../src/lib/db/client';
import { createLedgerEntry } from '../../src/lib/ledger/chain';
import { processWindow } from '../../src/lib/engine/window';
import { reconstructState } from '../../src/lib/engine/replay';
import { DeterministicTestClock } from '../../src/lib/engine/clock';

describe("Causal Trace Forensics: End-to-End Certification (Phase 5.5)", () => {
    
    beforeEach(async () => {
        await closeDBs();
        // Clear DBs for clean trace
        const dbs = [getVortexQueueDB(), getPulseLedgerDB()];
        for (const db of dbs) {
            try {
                const all = await db.allDocs({include_docs: true});
                for (const row of all.rows) await db.remove(row.doc as any);
            } catch (e: any) {}
        }
    });

    it("produces a complete causal path for a single trace_id", async () => {
        const source = 'seismic_count';
        const ts_raw = new Date(1776458400000).toISOString();
        const value = 42;
        const clock = new DeterministicTestClock(1776458400000);

        // STAGE 1: INGESTION
        const { trace_id } = await enqueueSample(source, ts_raw, { value }, clock);
        expect(trace_id).toBeDefined();

        // STAGE 2: QUEUE PERSISTENCE
        const queueDB = getVortexQueueDB();
        const allQueue = await queueDB.allDocs({include_docs: true});
        const queueEntry = allQueue.rows.find((r: any) => r.id.startsWith("queue::") && (r.doc as any).trace_id === trace_id)?.doc as any;
        expect(queueEntry).toBeDefined();
        expect(queueEntry.payload.value).toBe(42);

        // STAGE 3: LEDGER COMMITMENT
        // (Simulated manual commit from queue entry)
        const comp = processWindow(source, queueEntry.ts_norm, queueEntry.ts_norm, [value], 15, trace_id);
        const ledgerEntry = await createLedgerEntry(comp, "GENESIS_HASH", trace_id);
        const ledgerDB = getPulseLedgerDB();
        await ledgerDB.put(ledgerEntry);

        const savedLedger = await ledgerDB.get(ledgerEntry._id) as any;
        expect(savedLedger.trace_id).toBe(trace_id);
        expect(savedLedger.hash).toBe(ledgerEntry.hash);

        // STAGE 4: REPLAY RECONSTRUCTION
        const allLedger = await ledgerDB.allDocs({include_docs: true});
        const state = await reconstructState(allLedger.rows.map((r: any) => r.doc as any));
        
        const finalSignal = state.signals.get(source);
        expect(finalSignal).toBeDefined();
        expect(finalSignal!.trace_id).toBe(trace_id);
        expect(finalSignal!.signal_id).toBe(source);

        console.log(`[SUCCESS] FULL RECONSTRUCTION TRACE VERIFIED for TraceID: ${trace_id}`);
        console.log(`Ingestion: ${ts_raw} -> Queue: ${queueEntry._id} -> Ledger: ${ledgerEntry._id} -> Replay State OK.`);
    });
});
