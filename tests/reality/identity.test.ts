import { enqueueSample } from "../../src/lib/ingestion/queue";
import { getVortexQueueDB, getPulseLedgerDB   } from '../../src/lib/db/client';
import { createLedgerEntry, computeChainHash } from "../../src/lib/ledger/chain";
import { DeterministicTestClock } from "../../src/lib/engine/clock";

describe("Identity Logic: trace_id vs content_hash", () => {
    beforeEach(async () => {
        try {
            const all = await getVortexQueueDB().allDocs({include_docs: true});
            for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);
        } catch (e: any) {}
    });

    it("generates distinct trace_ids for identical payloads (Phase 4.1)", async () => {
        const clock = new DeterministicTestClock(1000 * 60);
        const source = 'seismic_count';
        const ts = new Date(1000 * 60).toISOString();
        const payload = { value: 10 };

        const { trace_id: t1 } = await enqueueSample(source, ts, payload, clock);
        const { trace_id: t2 } = await enqueueSample(source, ts, payload, clock);

        expect(t1).not.toBe(t2);
        
        // Both traces should point to the SAME sample marker (idempotency)
        const db = getVortexQueueDB();
        const allDocs = await db.allDocs({include_docs: true});
        const markers = allDocs.rows.filter((r: any) => r.id.startsWith("sample::"));
        expect(markers.length).toBe(1);
        
        // One process won the race (t1 or t2)
        expect([t1, t2]).toContain((markers[0].doc as any).trace_id);
    });

    it("verifies trace_id exists in queue but does not affect ledger chain parity", async () => {
        const payload = { 
            signal_id: 'seismic_count' as any, trace_id: "test_trace", trace_id: "test_trace", 
            ts_norm: 100000, 
            baseline: { robust_center: 10, robust_sigma: 1, mad: 0.67, mean: 10, type: 'median' as any },
            deviation: { value: 10, z_score: 0 },
            anomaly_flag: false as any,
            confidence: 1,
            correlation: []
        };
        
        const h1 = computeChainHash("PREV", payload, "SIG");
        
        // Ledger entry with trace_id A
        const entryA = await createLedgerEntry(payload, "PREV", "trace_aaa");
        // Ledger entry with trace_id B
        const entryB = await createLedgerEntry(payload, "PREV", "trace_bbb");
        
        // Hashes must be identical because trace_id IS METADATA only
        expect(entryA.hash).toBe(entryB.hash);
        expect(entryA.trace_id).toBe("trace_aaa");
        expect(entryB.trace_id).toBe("trace_bbb");
    });
});
