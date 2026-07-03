import { describe, it, expect, beforeEach } from 'vitest';
import { enqueueSample } from '../../src/lib/ingestion/queue';
import { getVortexQueueDB   } from '../../src/lib/db/client';
import { DeterministicTestClock } from '../../src/lib/engine/clock';

describe("Hardened Ingestion & Baseline Coverage", () => {
    beforeEach(async () => {
        const db = getVortexQueueDB();
        try {
            const all = await db.allDocs({include_docs: true});
            for (let row of all.rows) await db.remove(row.doc as any);
        } catch (e: any) {}
    });

    it("exercises queue.ts drift and validation branches", async () => {
        const clock = new DeterministicTestClock(1000000);
        
        // 1. Clock Drift (Future)
        const futureTs = new Date(1000000 + 60000).toISOString();
        const resDrift = await enqueueSample('seismic_count', futureTs, { value: 10 }, clock);
        expect(resDrift).toBeDefined();

        const db = getVortexQueueDB();
        const rejected = await db.allDocs({include_docs: true});
        expect(rejected.rows.some((r: any) => r.id.includes('rejected'))).toBe(true);

        // 2. Validation Error (Missing value)
        const resVal = await enqueueSample('seismic_count', new Date(1000000).toISOString(), { something: 'else' }, clock);
        expect(resVal).toBeDefined();
        const all = await db.allDocs({include_docs: true});
        const valRejected = all.rows.find((r: any) => r.id.includes('queue::') && (r.doc as any).status === 'rejected');
        expect(valRejected).toBeDefined();
    });

    it("exercises engine/baseline.ts contamination path", async () => {
        const { computeBaseline, detectContamination, median } = await import('../../src/lib/engine/baseline');
        
        // 1. Hit the 'else' branch of Zero Guard (line 39)
        const lowMed = [0.00000001, 10, -10, 0]; 
        expect(detectContamination(lowMed)).toBe(true); // Hits line 40

        // 2. Hit the isContaminated branch in computeBaseline (line 57)
        // [1, 10, 1, 10, 1, 10] -> Median=5.5, MAD=4.5 -> MAD/Med = 0.81 > 0.6
        const contaminated = [1, 10, 1, 10, 1, 10]; 
        const res = computeBaseline(contaminated);
        expect(res.type).toBe('median'); 
    });
});
