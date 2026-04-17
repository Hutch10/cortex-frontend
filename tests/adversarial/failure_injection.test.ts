import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import PouchDB from "pouchdb";
import { enqueueSample } from "../../src/lib/ingestion/queue";
import { RealClock } from "../../src/lib/engine/clock";

vi.mock("../../src/lib/db/client", () => {
    const PouchDB = require("pouchdb");
    return {
        vortexQueueDB: new PouchDB(`./test_db_vortex_failure_hardfixed_v2`),
        pulseLedgerDB: new PouchDB(`./test_db_ledger_failure_hardfixed_v2`),
        quarantineDB: new PouchDB(`./test_db_quar_failure_hardfixed_v2`)
    };
});

import { vortexQueueDB } from "../../src/lib/db/client";

describe("Adversarial Failure Injection", () => {
    const clock = new RealClock();
    const source = "seismic_count";

    beforeEach(async () => {
        try {
            const all = await vortexQueueDB.allDocs({ include_docs: true });
            for (const row of all.rows) await vortexQueueDB.remove(row.doc as any);
        } catch (e) {}
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("recovers gracefully from marker-write failure (Orphan Prevention)", async () => {
        const ts = new Date().toISOString();
        const putSpy = vi.spyOn(vortexQueueDB, 'put').mockRejectedValueOnce({ status: 500, message: "DISK_FAILURE" });

        await expect(enqueueSample(source as any, ts, { value: 10 }, clock)).rejects.toThrow("DISK_FAILURE");

        const all = await vortexQueueDB.allDocs({ include_docs: true });
        const queueEntries = all.rows.filter(r => r.id.startsWith("queue::"));
        expect(queueEntries.length).toBe(0);
        
        putSpy.mockRestore();
        await enqueueSample(source as any, ts, { value: 10 }, clock);
        
        const allRetry = await vortexQueueDB.allDocs({ include_docs: true });
        expect(allRetry.rows.filter(r => r.id.startsWith("queue::")).length).toBe(1);
    });

    it("survives 'partial write' state where marker exists but queue entry doesn't", async () => {
        const ts = new Date().toISOString();
        const ts_norm = Math.floor(new Date(ts).getTime() / 60000) * 60000;
        // MUST USE THE SAME SEPARATOR AS production: ||
        const markerId = `sample::${require("crypto").createHash('sha256').update(`${source}||${ts_norm}`).digest('hex')}`;
        
        await vortexQueueDB.put({ _id: markerId, source, ts_norm });

        await enqueueSample(source as any, ts, { value: 99 }, clock);
        
        const all = await vortexQueueDB.allDocs({ include_docs: true });
        const queueEntries = all.rows.filter(r => r.id.startsWith("queue::"));
        
        expect(queueEntries.length).toBe(0); 
    });
});
