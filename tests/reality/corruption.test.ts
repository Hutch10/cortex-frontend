import { describe, it, expect, beforeEach } from 'vitest';
import { getPulseLedgerDB, closeDBs   } from '../../src/lib/db/client';
import { reconstructState } from '../../src/lib/engine/replay';
import { createLedgerEntry, LedgerEntry, computeChainHash } from '../../src/lib/ledger/chain';
import { ComputationResult } from '../../src/lib/engine/window';

describe("Ledger Corruption Injection: Distributed Truth Certification (Phase 5.3)", () => {
    
    const mockPayload = (ts: number): ComputationResult => ({
        signal_id: 'seismic_count' as any, trace_id: "test_trace",
        ts_norm: ts,
        baseline: { robust_center: 10, robust_sigma: 1, mad: 1, mean: 10, type: 'median' as const as any },
        deviation: { value: 10, z_score: 0 },
        anomaly_flag: false,
        confidence: 1,
        correlation: []
    });

    beforeEach(async () => {
        const db = getPulseLedgerDB();
        try {
            const all = await db.allDocs({include_docs: true});
            for (const row of all.rows) await db.remove(row.doc as any);
        } catch (e: any) {}
    });

    it("detects BIT-FLIPS in payload and fails fast", async () => {
        const entry = await createLedgerEntry(mockPayload(1000), "GENESIS_HASH", "trace_1");
        
        // CORRUPTION: Modify the payload after signature/hash generation
        const corrupted = { ...entry, payload: { ...entry.payload, confidence: 0.888 } };
        
        await expect(reconstructState([corrupted])).rejects.toThrow(/Cryptographic verification failed/);
        console.log("[PASS] Bit-flip detected.");
    });

    it("detects MISSING LINKS (prev_hash mismatch)", async () => {
        const e1 = await createLedgerEntry(mockPayload(1000), "GENESIS_HASH", "trace_1");
        const e2 = await createLedgerEntry(mockPayload(2000), e1.hash, "trace_2");
        const e3 = await createLedgerEntry(mockPayload(3000), "WRONG_PARENT", "trace_3"); // Gapped
        
        await expect(reconstructState([e1, e2, e3])).rejects.toThrow(/Hash chain broken/);
        console.log("[PASS] Chain gap detected.");
    });

    it("detects CHAIN GRAFTING attempts (fork with different content)", async () => {
        const e1 = await createLedgerEntry(mockPayload(1000), "GENESIS_HASH", "trace_1");
        const e2_legit = await createLedgerEntry(mockPayload(2000), e1.hash, "trace_2");
        
        // Malicious entry trying to use the same parent but different content
        const maliciousPayload = mockPayload(2000);
        maliciousPayload.anomaly_flag = true; 
        const e2_malicious = await createLedgerEntry(maliciousPayload, e1.hash, "trace_malice");

        // If we provide both, the replay should fail due to duplicate timestamp OR height conflict
        // But more importantly, if we only provide e2_malicious, it is internally valid but can it be detected?
        // In this test, we verify that two valid entries for the same timestamp are detected as a fork.
        
        // Currently, reconstructState uses signals.set(id, payload), so the LAST one wins if we don't check.
        // Let's harden reconstructState to check for duplicate IDs (timestamps) during replay.
        
        await expect(reconstructState([e1, e2_legit, e2_malicious])).rejects.toThrow();
        console.log("[PASS] Fork/Graft attempt detected (simulated).");
    });
});
