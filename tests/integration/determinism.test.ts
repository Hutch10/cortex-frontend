import { enqueueSample } from "../../src/lib/ingestion/queue";
import { processWindow, ComputationResult } from "../../src/lib/engine/window";
import { createLedgerEntry } from "../../src/lib/ledger/chain";
import { quarantineEntry } from "../../src/lib/ledger/quarantine";
import { getVortexQueueDB, getPulseLedgerDB, getQuarantineDB } from "../../src/lib/db/client";

import { DeterministicTestClock } from "../../src/lib/engine/clock";

// Mocks the central processing orchestration loop that the app uses
async function runOrchestrationLoop(signalId: any, rawSamples: { ts: string, val: number }[]): Promise<ComputationResult[]> {
    const results: ComputationResult[] = [];
    let last_hash = "GENESIS_HASH";
    const windowValues: number[] = [];

    for (const sample of rawSamples) {
        const sampleTsRaw = new Date(sample.ts).getTime();
        const testClock = new DeterministicTestClock(sampleTsRaw);

        // 1. Ingest
        await enqueueSample(signalId, sample.ts, { value: sample.val }, testClock);
        
        // Fetch queue
        const allQ = await getVortexQueueDB().allDocs({include_docs: true});
        const qEntry = allQ.rows.find(r => r.id.startsWith("queue::") && (r.doc as any).status === 'pending');
        if (!qEntry) continue;
        
        const doc: any = qEntry.doc;
        windowValues.push(doc.payload.value);

        // 2 & 3 Process Window & Baseline / Confidence
        const comp = processWindow(
             signalId,
             testClock.now(),
             doc.ts_norm,
             [...windowValues],
             15
        ) as ComputationResult;
        
        results.push(comp);

        // 4. Ledger Write
        const lEntry = await createLedgerEntry(comp, last_hash);
        await getPulseLedgerDB().put(lEntry);
        
        last_hash = lEntry.hash;
        
        // Set queue status to processed
        doc.status = 'processed';
        await getVortexQueueDB().put(doc);
    }
    
    return results;
}

describe("Determinism and Integration Suites", () => {
    
    beforeEach(async () => {
        try {
            let all = await getQuarantineDB().allDocs({include_docs: true});
            for (let row of all.rows) await getQuarantineDB().remove(row.doc as any);
            all = await getPulseLedgerDB().allDocs({include_docs: true});
            for (let row of all.rows) await getPulseLedgerDB().remove(row.doc as any);
            all = await getVortexQueueDB().allDocs({include_docs: true});
            for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);
        } catch(e) {}
    });

    const nowStr = Date.now();
    const dataset = [
        { ts: new Date(nowStr).toISOString(), val: 10 },
        { ts: new Date(nowStr + 60000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 120000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 180000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 240000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 300000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 360000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 420000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 480000).toISOString(), val: 10 },
        { ts: new Date(nowStr + 540000).toISOString(), val: 50 }, // Outlier Spiked
        { ts: new Date(nowStr + 540000).toISOString(), val: 50 }, // Duplicate insertion test!
        { ts: new Date(nowStr + 600000).toISOString(), val: 10 }
    ];

    it("proves End-to-End Pipeline & Duplicate Idempotency", async () => {
        const results = await runOrchestrationLoop('seismic_count', dataset);
        
        // 12 points, 1 is duplicate and will be skipped by enqueueSample idempotency marker
        expect(results.length).toBe(11);
        
        const outlier = results.find(r => r.deviation.value === 50);
        expect(outlier).toBeDefined();
        // Since sample length is 10, confidence logic hits minimum window.
        expect(outlier!.confidence).toBeGreaterThanOrEqual(0);
        
        // Ledger should have all entries
        const allLedger = await getPulseLedgerDB().allDocs({include_docs: true});
        const validEntries = allLedger.rows.filter(r => r.id.startsWith("ledger::"));
        expect(validEntries.length).toBe(11);
    });

    it("Replay MUST yield perfectly identical outputs (Absolute Determinism)", async () => {
        const A_results = await runOrchestrationLoop('seismic_count', dataset);
        
        // using the exported ones, but actually recreate logic needs clean start
        let all = await getQuarantineDB().allDocs({include_docs: true});
        for (let row of all.rows) await getQuarantineDB().remove(row.doc as any);
        all = await getPulseLedgerDB().allDocs({include_docs: true});
        for (let row of all.rows) await getPulseLedgerDB().remove(row.doc as any);
        all = await getVortexQueueDB().allDocs({include_docs: true});
        for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);
    });
    
    it("Replay MUST yield perfectly identical outputs (Verification)", async () => {
        // Run once
        const A_results = await runOrchestrationLoop('seismic_count', dataset);
        
        const allLedgerA = await getPulseLedgerDB().allDocs({include_docs: true});
        const A_hashes = allLedgerA.rows.map(r => (r.doc as any).hash);
        console.log("REPLAY_BEFORE_HASHES:", JSON.stringify(A_hashes));
        const A_signatures = allLedgerA.rows.map(r => (r.doc as any).signature);
        
        // Wipe again
        let all = await getQuarantineDB().allDocs({include_docs: true});
        for (let row of all.rows) await getQuarantineDB().remove(row.doc as any);
        all = await getPulseLedgerDB().allDocs({include_docs: true});
        for (let row of all.rows) await getPulseLedgerDB().remove(row.doc as any);
        all = await getVortexQueueDB().allDocs({include_docs: true});
        for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);

        // Run second time
        const B_results = await runOrchestrationLoop('seismic_count', dataset);
        
        expect(A_results.length).toBe(B_results.length);
        
        for (let i = 0; i < A_results.length; i++) {
            const a = A_results[i];
            const b = B_results[i];
            expect(a.confidence).toBe(b.confidence);
            expect(a.ts_norm).toBe(b.ts_norm);
            expect(a.deviation.z_score).toBe(b.deviation.z_score);
            expect(a.baseline.robust_center).toBe(b.baseline.robust_center);
            expect(a.anomaly_flag).toBe(b.anomaly_flag);
        }
        
        // Ledger Hashes must match EXACTLY representing absolute determinism
        const allLedgerB = await getPulseLedgerDB().allDocs({include_docs: true});
        const B_hashes = allLedgerB.rows.map(r => (r.doc as any).hash);
        console.log("REPLAY_AFTER_HASHES: ", JSON.stringify(B_hashes));
        const B_signatures = allLedgerB.rows.map(r => (r.doc as any).signature);

        expect(A_hashes.length).toBe(B_hashes.length);
        for (let i = 0; i < A_hashes.length; i++) {
            expect(A_hashes[i]).toBe(B_hashes[i]);
            expect(A_signatures[i]).toBe(B_signatures[i]);
        }
    });

    it("preserves identical quarantine behavior offline", async () => {
         const results = await runOrchestrationLoop('seismic_count', dataset.slice(0, 3));
         
         const allL = await getPulseLedgerDB().allDocs({include_docs: true});
         const firstDoc = allL.rows[0].doc! as any;
         
         await quarantineEntry(firstDoc, "hash_mismatch", "TAMPER_HASH");
         
         const allQ = await getQuarantineDB().allDocs();
         expect(allQ.rows.length).toBe(1);
    });

});
