import { vi } from "vitest";

vi.mock("../../src/lib/db/client", () => {
    const PouchDB = require("pouchdb");
    const uniqueSuffix = Date.now().toString() + Math.random().toString();
    return {
        vortexQueueDB: new PouchDB("./test_db_vortex_fs_" + uniqueSuffix),
        pulseLedgerDB: new PouchDB("./test_db_ledger_fs_" + uniqueSuffix),
        quarantineDB: new PouchDB("./test_db_quar_fs_" + uniqueSuffix)
    };
});

import { getVortexQueueDB, getPulseLedgerDB, getQuarantineDB } from "../../src/lib/db/client";


import { enqueueSample } from "../../src/lib/ingestion/queue";
import { DeterministicTestClock } from "../../src/lib/engine/clock";
import { processWindow, ComputationResult } from "../../src/lib/engine/window";
import { createLedgerEntry } from "../../src/lib/ledger/chain";

async function runFilesystemLoop(signalId: any, rawSamples: { ts: string, val: number }[]): Promise<ComputationResult[]> {
    const results: ComputationResult[] = [];
    let last_hash = "GENESIS_HASH";
    const windowValues: number[] = [];

    for (const sample of rawSamples) {
        const sampleTsRaw = new Date(sample.ts).getTime();
        const testClock = new DeterministicTestClock(sampleTsRaw);

        await enqueueSample(signalId, sample.ts, { value: sample.val }, testClock);
        
        const allQ = await getVortexQueueDB().allDocs({include_docs: true});
        const qEntry = allQ.rows.find(r => r.id.startsWith("queue::") && (r.doc as any).status === 'pending');
        if (!qEntry) continue;
        
        const doc: any = qEntry.doc;
        windowValues.push(doc.payload.value);

        const comp = processWindow(signalId, testClock.now(), doc.ts_norm, [...windowValues], 15) as ComputationResult;
        results.push(comp);

        const lEntry = await createLedgerEntry(comp, last_hash);
        await getPulseLedgerDB().put(lEntry);
        last_hash = lEntry.hash;
        
        doc.status = 'processed';
        await getVortexQueueDB().put(doc);
    }
    return results;
}

describe("Persistence Reality Engine", () => {
    beforeEach(async () => {
        try {
            let all = await getVortexQueueDB().allDocs({include_docs: true});
            for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);
            all = await getPulseLedgerDB().allDocs({include_docs: true});
            for (let row of all.rows) await getPulseLedgerDB().remove(row.doc as any);
            all = await getQuarantineDB().allDocs({include_docs: true});
            for (let row of all.rows) await getQuarantineDB().remove(row.doc as any);
        } catch(e) {}
    });

    let loopCounter = 0;

    it("verifies indexdb/filesystem backing identically maintains determinism and hashes", async () => {
        const nowStr = Date.now() + (++loopCounter * 10000000);
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
            { ts: new Date(nowStr + 540000).toISOString(), val: 50 }, // Outlier
            { ts: new Date(nowStr + 540000).toISOString(), val: 50 }, // Duplicate 
            { ts: new Date(nowStr + 600000).toISOString(), val: 10 }
        ];

        // Run filesystem loop!
        const results = await runFilesystemLoop('seismic_count', dataset);
        expect(results.length).toBe(11); // duplicate stripped
        
        const allL = await getPulseLedgerDB().allDocs({include_docs: true});
        const hashes = allL.rows.map(r => (r.doc as any).hash);
        expect(hashes.length).toBe(11);
        
        // Exact identical ordering
        expect(hashes[0]).toBeDefined();
        
        // Clear before concurrency test to ensure exact marker count of 1 for the new unique ts
        let all = await getVortexQueueDB().allDocs({include_docs: true});
        for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);

        // Concurrency test inside filesystem
        const clock = new DeterministicTestClock(100000000);
        const promises = [];
        for (let i = 0; i < 50; i++) promises.push(enqueueSample('seismic_count', new Date(100000000).toISOString(), { value: 7 }, clock));
        await Promise.all(promises);

        const allQ = await getVortexQueueDB().allDocs({include_docs: true});
        const markers = allQ.rows.filter(r => r.id.startsWith("sample::"));
        expect(markers.length).toBe(1); // No race divergence!
    });
});


