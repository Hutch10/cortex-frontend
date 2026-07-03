import { enqueueSample } from "../../src/lib/ingestion/queue";
import { getVortexQueueDB   } from '../../src/lib/db/client';
import { DeterministicTestClock } from "../../src/lib/engine/clock";

describe("Data Hostility: Malformed Payload Resilience", () => {
    const clock = new DeterministicTestClock(100000000);

    beforeEach(async () => {
        const db = getVortexQueueDB();
        try {
            const all = await db.allDocs({include_docs: true});
            for (let row of all.rows) await db.remove(row.doc as any);
        } catch (e: any) {}
    });

    it("handles NaN and Infinity by normalizing to null (Phase 4.4)", async () => {
        await enqueueSample('seismic_count', new Date(100000000).toISOString(), { value: NaN }, clock);
        await enqueueSample('solar_flux', new Date(100000000).toISOString(), { value: Infinity }, clock);

        const db = getVortexQueueDB();
        const allDocs = await db.allDocs({include_docs: true});
        const entries = allDocs.rows.filter((r: any) => r.id.startsWith("queue::")).map((r: any) => r.doc as any);
        
        expect(entries.length).toBe(2);
        expect(entries[0].payload.value).toBeNull();
        expect(entries[1].payload.value).toBeNull();
    });

    it("rejects purely hostile garbage types (Nested Objects)", async () => {
        await enqueueSample('kp_index', new Date(100000000).toISOString(), { value: { attack: true } }, clock);
        
        const db = getVortexQueueDB();
        const allDocs = await db.allDocs({include_docs: true});
        const entry = allDocs.rows.find((r: any) => r.id.startsWith("queue::"))?.doc as any;
        
        // Validation should fail and status should be rejected
        expect(entry.status).toBe('rejected');
        expect(entry.payload.value).toBeNull();
    });

    it("resists timestamp overflow and garbage formats", async () => {
        // Very far future / out of range
        await enqueueSample('seismic_count', "9999-99-99T99:99:99Z", { value: 10 }, clock);
        
        // This should fail silently or record as rejected in queue if caught by normalization
        const db = getVortexQueueDB();
        const allDocs = await db.allDocs({include_docs: true});
        const rejected = allDocs.rows.filter((r: any) => (r.doc as any).status === 'rejected');
        
        // If normalization threw, we shouldn't have an entry (currently queue.ts catches and returns)
        // Let's verify no pending entry exists
        const pending = allDocs.rows.filter((r: any) => (r.doc as any).status === 'pending');
        expect(pending.length).toBe(0);
    });
});
