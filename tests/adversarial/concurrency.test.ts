import { describe, it, expect, beforeEach, vi } from "vitest";
import PouchDB from "pouchdb";
import { enqueueSample, insertPlaceholder } from "../../src/lib/ingestion/queue";
import { DeterministicTestClock } from "../../src/lib/engine/clock";

vi.mock("../../src/lib/db/client", () => {
    const PouchDB = require("pouchdb");
    return {
        getVortexQueueDB: () => new PouchDB(`./test_db_vortex_concurrency_hardfixed_v2`),
        pulseLedgerDB: new PouchDB(`./test_db_ledger_concurrency_hardfixed_v2`),
        quarantineDB: new PouchDB(`./test_db_quar_concurrency_hardfixed_v2`)
    };
});

import { getVortexQueueDB as mockedVortex } from "../../src/lib/db/client";

describe("Adversarial Concurrency Stress", () => {
    const ts_norm = 1776458000000;
    const clock = new DeterministicTestClock(ts_norm); // Pin clock to avoid drift
    const source = "seismic_count";

    beforeEach(async () => {
        try {
            const all = await mockedVortex().allDocs({ include_docs: true });
            for (const row of all.rows) await mockedVortex().remove(row.doc as { _id: string; _rev: string });
        } catch (e) {}
    });

    it("survives 1000 simultaneous insertPlaceholder calls with exactly one outcome", async () => {
        const promises = [];
        for (let i = 0; i < 1000; i++) {
            promises.push(insertPlaceholder(source, ts_norm));
        }
        await Promise.all(promises);
        const allDocs = await mockedVortex().allDocs({ include_docs: true });
        const entries = allDocs.rows.filter((r: { id: string; doc?: unknown }) => r.id.startsWith("queue::"));
        expect(entries.length).toBe(1);
    });

    it("survives high-race enqueueSample collisions (payload race)", async () => {
        const promises = [];
        const samples = [];
        for (let i = 0; i < 500; i++) {
            promises.push(enqueueSample(source, new Date(ts_norm).toISOString(), { value: i }, clock));
        }
        await Promise.all(promises);
        const allDocs = await mockedVortex().allDocs({ include_docs: true });
        const queueEntries = allDocs.rows.filter((r: { id: string; doc?: unknown }) => r.id.startsWith("queue::"));
        const markerEntries = allDocs.rows.filter((r: { id: string; doc?: unknown }) => r.id.startsWith("sample::"));

        expect(markerEntries.length).toBe(1);
        expect(queueEntries.length).toBe(1);
    });
});
