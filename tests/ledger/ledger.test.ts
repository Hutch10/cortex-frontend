import { computeChainHash, createLedgerEntry, verifyLedgerEntry } from "../../src/lib/ledger/chain";
import { quarantineEntry, createSegmentAnchor } from "../../src/lib/ledger/quarantine";
import { quarantineDB, pulseLedgerDB } from "../../src/lib/db/client";

describe("Forensic Ledger Tests", () => {

    beforeEach(async () => {
        try {
            let all = await quarantineDB.allDocs({include_docs: true});
            for (let row of all.rows) await quarantineDB.remove(row.doc as any);
            all = await pulseLedgerDB.allDocs({include_docs: true});
            for (let row of all.rows) await pulseLedgerDB.remove(row.doc as any);
        } catch(e) {}
    });

    const mockPayload: any = {
        signal_id: 'kp_index',
        ts_norm: 1000000,
        baseline: { robust_center: 0, robust_sigma: 1 },
        deviation: { value: 0, z_score: 0 },
        anomaly_flag: false,
        confidence: 1,
        correlation: []
    };

    describe("Chain & Signature", () => {
        it("creates valid ledger entry and verifies signature & hash", async () => {
             const last_hash = "GENESIS_HASH";
             const entry = await createLedgerEntry(mockPayload, last_hash);

             expect(entry.status).toBe('valid');
             expect(entry.prev_hash).toBe("GENESIS_HASH");
             expect(entry.hash).toBeDefined();
             expect(entry.signature).toBeDefined();

             const is_valid = await verifyLedgerEntry(entry);
             expect(is_valid).toBe(true);
        });

        it("detects tampered payload", async () => {
             const last_hash = "GENESIS_HASH";
             const entry = await createLedgerEntry(mockPayload, last_hash);

             // Tamper the payload!
             entry.payload.deviation.value = 999;
             const is_valid = await verifyLedgerEntry(entry);
             expect(is_valid).toBe(false);
        });
    });

    describe("Quarantine & Segment Anchors", () => {
        it("quarantines a failed entry and creates segment anchor", async () => {
             const entry = await createLedgerEntry(mockPayload, "HASH_1");
             
             const qEntry = await quarantineEntry(entry, "tamper_detected", "CORRUPTED_HASH");
             expect(qEntry.status).toBe('invalid');
             expect(qEntry.reason).toBe('tamper_detected');
             expect(qEntry.segment_id).toBeDefined();

             // Check db entry exists without deletion
             const allQ = await quarantineDB.allDocs({include_docs: true});
             expect(allQ.rows.length).toBe(1);

             const anchor = await createSegmentAnchor(qEntry.segment_id, "HASH_1", "1000000", "1000000");
             expect(anchor._id).toBe(`segment_anchor::${qEntry.segment_id}`);
             expect(anchor.hash_of_last_valid).toBe("HASH_1");
        });
        
        it("handles multiple consecutive corruptions without losing data", async () => {
            const e1 = await createLedgerEntry({...mockPayload, ts_norm: 1}, "H0");
            const e2 = await createLedgerEntry({...mockPayload, ts_norm: 2}, "H0");

            const q1 = await quarantineEntry(e1, "hash_mismatch", "BOGUS1");
            const q2 = await quarantineEntry(e2, "hash_mismatch", "BOGUS2");

            expect(q1.segment_id).not.toBe(q2.segment_id);

            const allQ = await quarantineDB.allDocs({include_docs: true});
            expect(allQ.rows.length).toBe(2);
        });
    });
});
