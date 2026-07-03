import { enqueueSample } from "../../src/lib/ingestion/queue";
import { DeterministicTestClock } from "../../src/lib/engine/clock";
import { getVortexQueueDB } from "../../src/lib/db/client";

describe("Concurrency Constraints Engine", () => {
    beforeEach(async () => {
        try {
            const allDocs = await getVortexQueueDB().allDocs({include_docs: true});
            for (let row of allDocs.rows) {
                await getVortexQueueDB().remove(row.doc as any);
            }
        } catch(e) {}
    });

    it("survives 50 parallel enqueue spikes without race duplication", async () => {
        const clock = new DeterministicTestClock(100000000);
        
        // Exact same timestamp means Idempotency SHOULD catch them all except one
        const ts = new Date(100000000).toISOString();
        const payload = { value: 7 };

        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(enqueueSample('seismic_count', ts, payload, clock));
        }

        await Promise.all(promises);

        const allQ = await getVortexQueueDB().allDocs({include_docs: true});
        const markers = allQ.rows.filter(r => r.id.startsWith("sample::"));
        const queueEntries = allQ.rows.filter(r => r.id.startsWith("queue::"));
        
        expect(markers.length).toBe(1);
        expect(queueEntries.length).toBe(1);
    });

    it("survives out of order random burst resolution", async () => {
         const clock = new DeterministicTestClock(100000000);
         const promises = [];

         // We will scatter 5 varying timestamps representing 2 buckets inside the valid 60s window
         const timestamps = [
             100000000, 
             100000000, 
             100020000,    // cross 60s boundary -> new bucket (+20s drift)
             100025000,    // same new bucket (+25s drift)
             100000000     // Duplicate
         ].map(t => new Date(t).toISOString());

         for (const ts of timestamps) {
             promises.push(enqueueSample('seismic_count', ts, { value: 2 }, clock));
         }

         await Promise.all(promises);
         
         const allQ = await getVortexQueueDB().allDocs({include_docs: true});
         // We expect 2 distinct queue entries and 2 markers
         const markers = allQ.rows.filter(r => r.id.startsWith("sample::"));
         expect(markers.length).toBe(2);
    });
});
