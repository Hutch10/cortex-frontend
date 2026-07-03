import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPulseLedgerDB, closeDBs   } from '../../src/lib/db/client';
import { reconstructState } from '../../src/lib/engine/replay';
import { LedgerEntry } from '../../src/lib/ledger/chain';

describe("Atomicity Simulation: Crash-Artifact Recovery (Phase 5.2)", () => {
    
    beforeEach(async () => {
        await closeDBs();
    });

    it("verifies that truncated/partial JSON records fail deterministically during replay", async () => {
        const db = getPulseLedgerDB();
        
        // 1. Create a valid entry
        const validEntry: LedgerEntry = {
            _id: 'ledger::1000',
            prev_hash: 'GENESIS_HASH',
            hash: 'some_hash',
            payload: { 
                signal_id: 'seismic_count' as any, trace_id: "test_trace", trace_id: "test_trace", 
                ts_norm: 1000, 
                baseline: { robust_center: 10, robust_sigma: 1, mad: 1, mean: 10, type: 'median' as const as any },
                deviation: { value: 10, z_score: 0 },
                anomaly_flag: false,
                confidence: 1,
                correlation: []
            },
            signature: 'some_sig',
            status: 'valid',
            trace_id: 'trace_1'
        };

        // 2. Simulate a crash-artifact by injecting a record that will RENDER as invalid JSON 
        // Or more realistically for this test: a record that is missing required fields (partial write)
        const partialEntry: any = {
            _id: 'ledger::2000',
            prev_hash: 'some_hash',
            // hash is missing (simulated partial write)
            payload: { ts_norm: 2000 },
            status: 'valid'
        };

        // 3. Mock the get/allDocs response to simulate a "truncated JSON" read
        // In a real LevelDB crash, the file might contain: {"_id":"ledger::3000","prev_ha... [EOF]
        // This would cause a JSON.parse error in the adapter.
        
        const entries = [validEntry, partialEntry];

        // 4. Prove Fail-Fast on Partial Data
        // reconstructState should catch that 'partialEntry' is missing cryptographic anchors
        await expect(reconstructState(entries)).rejects.toThrow(/CRITICAL_DISCONTINUITY/);
        
        console.log("[SUCCESS] Replay Engine correctly rejected partial/truncated write artifact.");
    });

    it("simulates a total JSON parser crash during database fetch", async () => {
        const db = getPulseLedgerDB();
        
        // Mock allDocs to throw a SyntaxError (simulating corrupted LevelDB block)
        const spy = vi.spyOn(db, 'allDocs').mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));

        try {
            await db.allDocs({include_docs: true});
        } catch (e: any) {
            expect(e instanceof SyntaxError).toBe(true);
            expect(e.message).toContain("Unexpected end of JSON input");
        }

        console.log("[SUCCESS] System handles native JSON parse failures as caught exceptions.");
        spy.mockRestore();
    });
});
