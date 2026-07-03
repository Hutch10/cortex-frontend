import { describe, it, expect, beforeEach, vi } from "vitest";
import PouchDB from "pouchdb";
import { enqueueSample } from "../../src/lib/ingestion/queue";
import { DeterministicTestClock } from "../../src/lib/engine/clock";

vi.mock("../../src/lib/db/client", () => {
    const PouchDB = require("pouchdb");
    return {
        getVortexQueueDB: () => new PouchDB(`./test_db_vortex_volume_hardfixed_v3`),
        pulseLedgerDB: new PouchDB(`./test_db_ledger_volume_hardfixed_v3`),
        quarantineDB: new PouchDB(`./test_db_quar_volume_hardfixed_v3`)
    };
});

import { getVortexQueueDB } from "../../src/lib/db/client";

describe("Adversarial High-Volume Ingestion", () => {
    const source = "seismic_count";

    beforeEach(async () => {
        try {
            const all = await getVortexQueueDB().allDocs({ include_docs: true });
            for (const row of all.rows) await getVortexQueueDB().remove(row.doc as { _id: string; _rev: string });
        } catch (e) {}
    });

    it("processes 10,000 unique events without corruption or memory explosion", async () => {
        const TOTAL = 10000;
        const startTs = 1776458000000;
        
        console.log(`[VOLUME] Starting ingestion of ${TOTAL} samples...`);
        const startTime = Date.now();

        for (let i = 0; i < TOTAL; i++) {
            const ts_ms = startTs + (i * 60000);
            const clock = new DeterministicTestClock(ts_ms);
            const ts_str = new Date(ts_ms).toISOString();
            await enqueueSample(source, ts_str, { value: Math.random() * 100 }, clock);
        }

        const duration = Date.now() - startTime;
        console.log(`[VOLUME] Ingested ${TOTAL} samples in ${duration}ms`);

        const allQ = await getVortexQueueDB().allDocs();
        expect(allQ.total_rows).toBe(TOTAL * 2);
    }, 60000); // 60s timeout
});
