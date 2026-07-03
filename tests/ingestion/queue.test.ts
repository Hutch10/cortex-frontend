import { enqueueSample, handleOutOfOrder, insertPlaceholder, QueueEntry } from "../../src/lib/ingestion/queue";
import { normalizeTimestamp } from "../../src/lib/ingestion/normalization";
import { validateSample } from "../../src/lib/ingestion/validator";
import { getVortexQueueDB } from "../../src/lib/db/client";
import { SYSTEM_CONSTANTS } from "../../src/lib/constants";

describe("Ingestion Engine Tests", () => {
    
    beforeEach(async () => {
        // Clear DB using the valid method
        try {
            const allDocs = await getVortexQueueDB().allDocs({include_docs: true});
            for (let row of allDocs.rows) {
                await getVortexQueueDB().remove(row.doc as any);
            }
        } catch(e) {}
    });

    describe("Normalization & Validation", () => {
        it("rejects invalid schema", () => {
            const payload = { val: 50 }; // should be 'value'
            const res = validateSample("kp_index", payload);
            expect(res.valid).toBe(false);
            expect(res.errors).not.toBeNull();
        });

        it("accepts valid schema", () => {
            const payload = { value: 5 };
            const res = validateSample("kp_index", payload);
            expect(res.valid).toBe(true);
        });

        it("detects clock drift > 30s", () => {
             const now = Date.now();
             const stamp = new Date(now - 35000).toISOString();
             const res = normalizeTimestamp(stamp, now);
             expect(res.is_drifting).toBe(true);
        });
    });

    describe("Queue constraints", () => {
        it("enqueues valid sample", async () => {
            await enqueueSample("kp_index", new Date().toISOString(), { value: 3 });
            const all = await getVortexQueueDB().allDocs({include_docs: true});
            // We should have a marker and a queue entry
            expect(all.rows.length).toBe(2);
            
            const qEntry = all.rows.find(r => r.id.startsWith("queue::"));
            expect(qEntry).toBeDefined();
            expect((qEntry!.doc as any).status).toBe('pending');
        });

        it("rejects duplicates using SHA-256 idempotency", async () => {
            const ts = new Date().toISOString();
            await enqueueSample("kp_index", ts, { value: 3 });
            await enqueueSample("kp_index", ts, { value: 3 });
            await enqueueSample("kp_index", ts, { value: 5 }); // same timestamp, different payload
            
            // Check that only 1 was kept
            const all = await getVortexQueueDB().allDocs({include_docs: true});
            const markers = all.rows.filter(r => r.id.startsWith("sample::"));
            expect(markers.length).toBe(1);
        });

        it("queue out of order handles correctly", async () => {
            const now = Date.now();
            const last_norm = Math.floor(now / SYSTEM_CONSTANTS.INTERVAL_MS) * SYSTEM_CONSTANTS.INTERVAL_MS;
            
            const dummyEntry: any = { ts_norm: last_norm - SYSTEM_CONSTANTS.INTERVAL_MS * 4 }; // 4 mins ago (MAX = 3)
            const rejected = await handleOutOfOrder("kp_index", dummyEntry, last_norm);
            expect(rejected).toBe('reject');

            const acceptedEntry: any = { ts_norm: last_norm - SYSTEM_CONSTANTS.INTERVAL_MS * 1 };
            const accepted = await handleOutOfOrder("kp_index", acceptedEntry, last_norm);
            expect(accepted).toBe('accept');

            const futureEntry: any = { ts_norm: last_norm + SYSTEM_CONSTANTS.INTERVAL_MS * 5 };
            const buffered = await handleOutOfOrder("kp_index", futureEntry, last_norm);
            expect(buffered).toBe('buffer');
        });

        it("inserts placeholder", async () => {
            const ts = Date.now();
            await insertPlaceholder("kp_index", ts);
            const all = await getVortexQueueDB().allDocs({include_docs: true});
            const qEntry = all.rows.find(r => r.id.startsWith("queue::"));
            expect(qEntry).toBeDefined();
            expect((qEntry!.doc as any).status).toBe('missing');
        });
    });
});
