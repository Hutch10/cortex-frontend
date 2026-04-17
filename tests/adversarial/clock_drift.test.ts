import { describe, it, expect, beforeEach, vi } from "vitest";
import PouchDB from "pouchdb";
import { enqueueSample } from "../../src/lib/ingestion/queue";
import { Clock } from "../../src/lib/engine/clock";

vi.mock("../../src/lib/db/client", () => {
    const PouchDB = require("pouchdb");
    return {
        vortexQueueDB: new PouchDB(`./test_db_vortex_drift_hardfixed`),
        pulseLedgerDB: new PouchDB(`./test_db_ledger_drift_hardfixed`),
        quarantineDB: new PouchDB(`./test_db_quar_drift_hardfixed`)
    };
});

import { vortexQueueDB } from "../../src/lib/db/client";

class JumpClock implements Clock {
    constructor(private time: number) {}
    now() { return this.time; }
    set(t: number) { this.time = t; }
}

describe("Adversarial Clock Drift Reality", () => {
    const source = "seismic_count";

    beforeEach(async () => {
        try {
            const all = await vortexQueueDB.allDocs({ include_docs: true });
            for (const row of all.rows) await vortexQueueDB.remove(row.doc as any);
        } catch (e) {}
    });

    it("rejects extreme future spikes (> 30s) as ghost samples", async () => {
        const arrivalClock = new JumpClock(Date.now());
        const futureTs = new Date(arrivalClock.now() + 65000).toISOString(); 
        
        await enqueueSample(source, futureTs, { value: 10 }, arrivalClock);
        
        const all = await vortexQueueDB.allDocs({ include_docs: true });
        const entry = all.rows.find(r => r.id.startsWith("queue::"));
        expect(entry).toBeDefined();
        expect((entry!.doc as any).status).toBe("rejected");
        expect((entry!.doc as any).reason).toContain("Clock drift exceeded");
    });

    it("rejects backward time jumps (Arrival < Sample TS - 30s)", async () => {
        const arrivalClock = new JumpClock(Date.now());
        const sampleTs = new Date(arrivalClock.now() + 45000).toISOString(); 
        
        await enqueueSample(source, sampleTs, { value: 20 }, arrivalClock);

        const all = await vortexQueueDB.allDocs({ include_docs: true });
        const entry = all.rows.find(r => (r.doc as any).status === 'rejected' && (r.doc as any).ts_raw === sampleTs);
        expect(entry).toBeDefined();
    });

    it("accepts samples within the 30s tolerance window", async () => {
        // Sample is 15s in the future relative to arrival - OK
        const arrivalClock = new JumpClock(Date.now());
        const sampleTs = new Date(arrivalClock.now() + 15000).toISOString(); 
        
        await enqueueSample(source, sampleTs, { value: 30 }, arrivalClock);
        
        const all = await vortexQueueDB.allDocs({ include_docs: true });
        const entry = all.rows.find(r => (r.doc as any).status === 'pending' && (r.doc as any).ts_raw === sampleTs);
        expect(entry).toBeDefined();
    });
});
