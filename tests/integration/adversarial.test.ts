import { validateSample } from "../../src/lib/ingestion/validator";
import { enqueueSample } from "../../src/lib/ingestion/queue";
import { DeterministicTestClock } from "../../src/lib/engine/clock";
import { vortexQueueDB } from "../../src/lib/db/client";
import { signPayload, verifySignature } from "../../src/lib/ledger/audit";
import { vi } from "vitest";

describe("Adversarial Engine & Parity Tests", () => {
    beforeEach(async () => {
        try {
            const allDocs = await vortexQueueDB.allDocs({include_docs: true});
            for (let row of allDocs.rows) {
                await vortexQueueDB.remove(row.doc as any);
            }
        } catch(e) {}
    });

    describe("Schema Verification & Obscure Branches", () => {
        it("validates solar_flux within minimums", () => {
            expect(validateSample('solar_flux', { value: 1.1 }).valid).toBe(true);
            expect(validateSample('solar_flux', { value: -1 }).valid).toBe(false);
        });

        it("fails completely unknown sources", () => {
            const res = validateSample('unknown_alien_signal' as any, { value: 0 });
            expect(res.valid).toBe(false);
            expect(res.errors).toContain("Unknown source schema");
        });

        it("malformed payload passing as an object but missing values", () => {
            const res = validateSample('seismic_count', { nothing: 1 });
            expect(res.valid).toBe(false);
        });
    });

    describe("Time Drift Edge Bounds", () => {
        it("accepts exactly 30s drift boundary", async () => {
            const clock = new DeterministicTestClock(100000000);
            
            // exactly +30s drift (100000000 + 30000)
            await enqueueSample('seismic_count', new Date(100030000).toISOString(), { value: 5 }, clock);
            
            const allQ = await vortexQueueDB.allDocs({include_docs: true});
            expect(allQ.rows.length).toBeGreaterThan(0);
        });

        it("completely rejects 31s drift boundary and records it", async () => {
            const clock = new DeterministicTestClock(100000000);
            
            // strictly > 30s
            await enqueueSample('seismic_count', new Date(100031000).toISOString(), { value: 5 }, clock);
            
            const allQ = await vortexQueueDB.allDocs({include_docs: true});
            // Should be 1 entry (the rejection record)
            expect(allQ.rows.length).toBe(1);
            expect((allQ.rows[0].doc as any).status).toBe('rejected');
        });
        
        it("gracefully catches completely broken timestamp formats", async () => {
             const clock = new DeterministicTestClock(100000000);
             await enqueueSample('seismic_count', "bogus-time-string", { value: 5 }, clock);
             const allQ = await vortexQueueDB.allDocs({include_docs: true});
             expect(allQ.rows.length).toBe(0);
        });

        it("throws fatal db errors exactly upstream in queue operations", async () => {
             const clock = new DeterministicTestClock(123456789);

             // First put is marker -> succeed. Second put is entry -> throw 409.
             const putSpy = vi.spyOn(vortexQueueDB, 'put');
             putSpy.mockResolvedValueOnce({ ok: true, id: "test", rev: "1" } as any);
             putSpy.mockRejectedValueOnce({ status: 409, message: "Conflict Entry" });
             
             await enqueueSample('seismic_count', new Date(123456789).toISOString(), { value: 5 }, clock);
             putSpy.mockRestore();

             // First put is marker -> succeed. Second put is entry -> throw 500.
             const putSpy500 = vi.spyOn(vortexQueueDB, 'put');
             putSpy500.mockResolvedValueOnce({ ok: true, id: "test", rev: "1" } as any);
             putSpy500.mockRejectedValueOnce({ status: 500, message: "Fatal DB Write Error" });
             
             await expect(enqueueSample('seismic_count', new Date(123456799).toISOString(), { value: 5 }, clock))
                 .rejects.toThrow("Fatal DB Write Error");
             putSpy500.mockRestore();

             const getSpy = vi.spyOn(vortexQueueDB, 'get').mockRejectedValueOnce({ status: 500, message: "Fatal DB Read Error" });
             await expect(enqueueSample('seismic_count', new Date(123456800).toISOString(), { value: 5 }, clock))
                 .rejects.toThrow("Fatal DB Read Error");
             getSpy.mockRestore();
             
             const { insertPlaceholder } = await import("../../src/lib/ingestion/queue");

             const getSpyNotFound = vi.spyOn(vortexQueueDB, 'get').mockRejectedValueOnce({ status: 404 });
             const putSpyConflict = vi.spyOn(vortexQueueDB, 'put').mockRejectedValueOnce({ status: 409 });
             await insertPlaceholder('seismic_count', 987654321); // should gracefully handle 409

             getSpyNotFound.mockRestore();
             putSpyConflict.mockRestore();

             const getSpy2 = vi.spyOn(vortexQueueDB, 'get').mockRejectedValueOnce({ status: 500, message: "Fatal DB Read Error" });
             await expect(insertPlaceholder('seismic_count', 987654321))
                 .rejects.toThrow("Fatal DB Read Error");
             getSpy2.mockRestore();

             const getSpyNotFound2 = vi.spyOn(vortexQueueDB, 'get').mockRejectedValueOnce({ status: 404 });
             const putSpy2 = vi.spyOn(vortexQueueDB, 'put').mockRejectedValueOnce({ status: 500, message: "Fatal DB Write Error" });
             await expect(insertPlaceholder('seismic_count', 987654322))
                 .rejects.toThrow("Fatal DB Write Error");
             getSpyNotFound2.mockRestore();
             putSpy2.mockRestore();
        });
    });

    describe("Crypto Parity (NodeJS Native Wrapper)", () => {
        it("strictly signs and verifies natively using the unified wrapper", async () => {
             const sig = await signPayload("determinism_payload_string");
             const verified = await verifySignature("determinism_payload_string", sig);
             expect(verified).toBe(true);
             
             // Test dynamic public key params derivation (branch coverage)
             const { getPublicKey } = await import("../../src/lib/ledger/audit");
             const rawPub = await getPublicKey();
             const verifiedWithParams = await verifySignature("determinism_payload_string", sig, rawPub);
             expect(verifiedWithParams).toBe(true);

             const hacked = await verifySignature("tampered_payload_string", sig);
             expect(hacked).toBe(false);
        });
    });
});
