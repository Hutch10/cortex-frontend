import { vi, describe, it, expect, beforeEach } from "vitest";
import { getVortexQueueDB, getPulseLedgerDB, getQuarantineDB } from "../../src/lib/db/client";
import { insertPlaceholder, enqueueSample } from "../../src/lib/ingestion/queue";
import { verifyLedgerEntry, createLedgerEntry } from "../../src/lib/ledger/chain";
import { processWindow, ComputationResult } from "../../src/lib/engine/window";
import { DeterministicTestClock } from "../../src/lib/engine/clock";

describe("Certification Branch Coverage Extension", () => {
    beforeEach(async () => {
        try {
            let all = await getVortexQueueDB().allDocs({include_docs: true});
            for (let row of all.rows) await getVortexQueueDB().remove(row.doc as any);
            all = await getPulseLedgerDB().allDocs({include_docs: true});
            for (let row of all.rows) await getPulseLedgerDB().remove(row.doc as any);
        } catch(e) {}
    });

    it("triggers queue.ts early exit in insertPlaceholder", async () => {
        const ts = 123456789;
        // 1. Insert manually to create collision
        await getVortexQueueDB().put({ _id: `queue::kp_index::${ts}`, status: 'pending' });
        
        // 2. Call insertPlaceholder - should trigger 'return' branch (line 103)
        await insertPlaceholder('kp_index', ts);
        
        const doc = await getVortexQueueDB().get(`queue::kp_index::${ts}`);
        expect((doc as any).status).toBe('pending'); // Marker should NOT have overwritten it to 'missing'
    });

    it("triggers chain.ts error branches in verifyLedgerEntry", async () => {
        const dummyPayload: ComputationResult = {
            signal_id: 'hrv',
            ts_norm: 1000,
            baseline: { med: 0, mad: 1, robust_center: 0, robust_sigma: 1, type: 'median', mean: 0, stddev: 1 },
            deviation: { value: 0, z_score: 0 },
            anomaly_flag: false,
            confidence: 1,
            correlation: [], trace_id: 'test-trace-coverage-001'
        };

        const entry = await createLedgerEntry(dummyPayload, 'PREV_HASH');

        // 1. Test invalid status branch (line 39)
        entry.status = 'invalid';
        expect(await verifyLedgerEntry(entry)).toBe(false);
        entry.status = 'valid';

        // 2. Test invalid signature branch (line 43)
        const tamperedSig = entry.signature.replace(/[0-9a-f]/, 'z'); // Invalid hex but wait, signature is hex. 
        // Let's just flip a character
        const tamperedSigValidHex = entry.signature[0] === '0' ? '1' + entry.signature.slice(1) : '0' + entry.signature.slice(1);
        expect(await verifyLedgerEntry({...entry, signature: tamperedSigValidHex})).toBe(false);

        // 3. Test invalid hash branch (line 47)
        expect(await verifyLedgerEntry({...entry, hash: 'TAMPERED_HASH'})).toBe(false);
    });

    it("triggers window.ts early exit for small windows", async () => {
        // hits line 38 - values.length < 10
        const res = processWindow('hrv', 2000, 1000, [1, 2, 3], 15) as ComputationResult;
        expect(res.confidence).toBe(0);
        expect(res.deviation.value).toBe(3);
    });

    it("triggers queue.ts fatal error on marker write", async () => {
        // hits line 74
        const clock = new DeterministicTestClock(1000000);
        const putSpy = vi.spyOn(getVortexQueueDB(), 'put').mockRejectedValueOnce({ status: 500, message: "FATAL_DISK_ERROR" });
        
        await expect(enqueueSample('kp_index', new Date(1000000).toISOString(), { value: 1 }, clock))
            .rejects.toThrow("FATAL_DISK_ERROR");
            
        putSpy.mockRestore();
    });
});
