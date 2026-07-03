import { createLedgerEntry, verifyLedgerEntry } from "../../src/lib/ledger/chain";
import { quarantineEntry } from "../../src/lib/ledger/quarantine";
import { getPulseLedgerDB, getQuarantineDB   } from '../../src/lib/db/client';

describe("Persistence Corruption: Ledger Tamper Detection", () => {
    beforeEach(async () => {
        const db = getPulseLedgerDB();
        try {
            const all = await db.allDocs({include_docs: true});
            for (let row of all.rows) await db.remove(row.doc as { _id: string; _rev: string });
        } catch (e: any) {}
    });

    it("detects and quarantines tampered ledger entries (Phase 4.5)", async () => {
        const payload = { 
            signal_id: 'seismic_count' as const, trace_id: "test_trace", 
            ts_norm: 100000, 
            baseline: { robust_center: 10, robust_sigma: 1, mad: 0.67, mean: 10, type: 'median' as const },
            deviation: { value: 10, z_score: 0 },
            anomaly_flag: false as const,
            confidence: 1,
            correlation: []
        };
        
        const entry = await createLedgerEntry(payload, "GENESIS", "trace_real");
        
        // 1. Verify clean
        expect(await verifyLedgerEntry(entry)).toBe(true);

        // 2. Tamper with payload (Simulate Disk Corruption / Bit-rot)
        const tamperedEntry = { ...entry, payload: { ...entry.payload, confidence: 0.999 } };
        
        // 3. Verify detection
        const isValid = await verifyLedgerEntry(tamperedEntry);
        expect(isValid).toBe(false);

        // 4. Test Quarantine recovery path
        await quarantineEntry(tamperedEntry, "tamper_detected", "RECOMPUTE_FAIL");
        
        const dbQ = getQuarantineDB();
        const allQ = await dbQ.allDocs({include_docs: true});
        expect(allQ.rows.length).toBe(1);
        expect((allQ.rows[0].doc as const).reason).toBe("tamper_detected");
    });
});
