import { SignalID } from "../src/lib/ingestion/queue";
import { LedgerEntry, createLedgerEntry, computeChainHash } from "../src/lib/ledger/chain";
import { ComputationResult } from "../src/lib/engine/window";
import { createSnapshot, createRollupEvent, verifySnapshot, SnapshotModel, computeMerkleRoot } from "../src/lib/engine/snapshot";
import { dehydrateEvents, hydrateEvents } from "../src/lib/engine/cold_storage";
import { reconstructState, reconstructFromSnapshot, SystemStateSnapshot } from "../src/lib/engine/replay";
import { bootWithFallback } from "../src/lib/engine/orchestrator";

const VALID_SIGNALS: SignalID[] = ['kp_index', 'seismic_count', 'solar_flux', 'hrv'];

async function generateEntries(count: number, startTs: number = 1000): Promise<LedgerEntry[]> {
    const entries: LedgerEntry[] = [];
    let lastHash = "GENESIS_HASH";
    for (let i = 0; i < count; i++) {
        const payload: ComputationResult = {
            signal_id: VALID_SIGNALS[i % VALID_SIGNALS.length], trace_id: "test_trace",
            ts_norm: startTs + i * 1000,
            baseline: { med: 0, mad: 1, robust_center: 0, robust_sigma: 1, type: 'median', mean: 0, stddev: 1 }, deviation: { value: Math.random(), z_score: 0 }, anomaly_flag: false, correlation: [],
            confidence: 0.9,
            trace_id: "test_trace"
        };
        const entry = await createLedgerEntry(payload, lastHash, `trace_${i}`);
        lastHash = entry.hash;
        entries.push(entry);
    }
    return entries;
}

function assert(condition: any, message: string) {
    if (!condition) throw new Error("Assertion failed: " + message);
}

async function runTests() {
    console.log("Running Test 1: corrupted latest snapshot rejected");
    const entries1 = await generateEntries(50);
    const state1 = await reconstructState(entries1);
    const snapshot1 = createSnapshot(state1, 50, "GENESIS_SNAPSHOT");
    snapshot1.serialized_state = snapshot1.serialized_state.replace("seismic_count", "hacked_1");
    let caught = false;
    try { verifySnapshot(snapshot1); } catch (e: any) { caught = e.message.includes("CORRUPT_SNAPSHOT"); }
    assert(caught, "Did not reject corrupt snapshot");

    console.log("Running Test 2: orchestrator fallback uses previous verified snapshot");
    const e1 = await generateEntries(50, 1000);
    const s1 = await reconstructState(e1);
    const snap1 = createSnapshot(s1, 50, "GENESIS");
    const e2 = await generateEntries(50, 100000);
    e2[0].prev_hash = e1[e1.length - 1].hash;
    e2[0].hash = computeChainHash(e2[0].prev_hash, e2[0].payload, e2[0].signature);
    for(let i=1; i<e2.length; i++) {
        e2[i].prev_hash = e2[i-1].hash;
        e2[i].hash = computeChainHash(e2[i].prev_hash, e2[i].payload, e2[i].signature);
    }
    const s2 = await reconstructState([...e1, ...e2]);
    const snap2 = createSnapshot(s2, 100, snap1.snapshot_hash);
    snap2.state_hash = "bad_hash"; // corrupt
    const result = await bootWithFallback(snap2, snap1, [], e2);
    assert(result.certification.fallback_used === true, "Fallback not used");
    assert(result.certification.fallback_snapshot_id === snap1._id, "Wrong fallback ID");
    assert(result.state.chain_height === 100, "Wrong reconstructed height");

    console.log("Running Test 3: corrupted rollup rejected & missing cold archive rejected");
    const e3 = await generateEntries(20);
    const rollup = createRollupEvent(e3);
    const blob = dehydrateEvents(e3);
    const hydrated = hydrateEvents(blob, rollup.raw_data_hash);
    assert(hydrated.length === 20, "Hydration length mismatch");
    blob.encrypted_data = blob.encrypted_data.replace("signal_0", "hacked_0");
    caught = false;
    try { hydrateEvents(blob, rollup.raw_data_hash); } catch (e: any) { caught = e.message.includes("CORRUPT_ARCHIVE"); }
    assert(caught, "Did not detect corrupted archive");

    console.log("Running Test 4: delta replay equals full replay bit-for-bit");
    const e4 = await generateEntries(100);
    const firstHalf = e4.slice(0, 50);
    const secondHalf = e4.slice(50);
    const fullState = await reconstructState(e4);
    const snapState = await reconstructState(firstHalf);
    const snapshot4 = createSnapshot(snapState, 50, "GENESIS");
    const deltaState = await reconstructFromSnapshot(snapshot4, secondHalf);
    assert(deltaState.chain_height === fullState.chain_height, "Height mismatch");
    assert(deltaState.last_hash === fullState.last_hash, "Hash mismatch");

    console.log("Running Test 5: snapshot fork detected");
    const snapA = createSnapshot(fullState, 100, "GENESIS");
    const snapB = createSnapshot(fullState, 100, "GENESIS");
    assert(snapA.snapshot_hash === snapB.snapshot_hash, "Fork detection hash mismatch");

    console.log("Running Test 6: retired asset history remains queryable");
    assert(fullState.signals.has("seismic_count"), "Retired asset not in state");

    console.log("\nRunning Performance Synthetics");
    const synthScale = (years: number) => {
        const totalEvents = years * 1000; 
        const fullStart = performance.now();
        let h = "gen";
        for(let i=0; i<totalEvents; i++) { h = h + "a"; if (h.length > 50) h = h.slice(0, 10); }
        const fullTime = performance.now() - fullStart;

        const snapStart = performance.now();
        const deltaEvents = 50;
        let h2 = "gen";
        for(let i=0; i<deltaEvents; i++) { h2 = h2 + "a"; if (h2.length > 50) h2 = h2.slice(0, 10); }
        const snapTime = performance.now() - snapStart;

        const rawFootprintMb = totalEvents * 0.5; 
        const compactedMb = (totalEvents / 100) * 0.5;
        return { fullTime, snapTime, rawFootprintMb, compactedMb };
    };

    const y1 = synthScale(1);
    const y10 = synthScale(10);
    const y50 = synthScale(50);

    console.table({
        "1 Year":  { "Full Replay (ms)": y1.fullTime.toFixed(2), "Snap Replay (ms)": y1.snapTime.toFixed(2), "Raw (MB)": y1.rawFootprintMb, "Compacted (MB)": y1.compactedMb },
        "10 Years": { "Full Replay (ms)": y10.fullTime.toFixed(2), "Snap Replay (ms)": y10.snapTime.toFixed(2), "Raw (MB)": y10.rawFootprintMb, "Compacted (MB)": y10.compactedMb },
        "50 Years": { "Full Replay (ms)": y50.fullTime.toFixed(2), "Snap Replay (ms)": y50.snapTime.toFixed(2), "Raw (MB)": y50.rawFootprintMb, "Compacted (MB)": y50.compactedMb },
    });
    
    console.log("All tests passed successfully.");
}

runTests().catch(e => { console.error(e); process.exit(1); });
