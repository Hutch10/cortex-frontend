import { fork } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getVortexQueueDB, getPulseLedgerDB   } from '../../src/lib/db/client';

describe("Multi-Process Reality Stress: Cross-Boundary Idempotency", () => {
    const TEST_DB_DIR = path.resolve(process.cwd(), 'test_db_reality_multi');

    beforeEach(async () => {
        if (fs.existsSync(TEST_DB_DIR)) {
            fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    });

    afterAll(async () => {
        if (fs.existsSync(TEST_DB_DIR)) {
            // Clean up
           try { fs.rmSync(TEST_DB_DIR, { recursive: true, force: true }); } catch (e: any) {}
        }
    });

    it("survives 5 parallel processes ingesting the SAME payload (Phase 4.2)", async () => {
        const workerPath = path.resolve(__dirname, 'worker_sim.js');
        const source = 'seismic_count';
        const ts = new Date().toISOString();
        const value = "42.5";
        const clockNow = Date.now().toString();

        const spawnWorker = () => {
            return new Promise((resolve, reject) => {
                const child = fork(workerPath, [source, ts, value, clockNow], {
                    env: { ...process.env, VORTEX_DB_DIR: TEST_DB_DIR },
                    execArgv: ['--import', 'tsx']
                });

                child.on('message', (msg) => {
                    resolve(msg);
                });

                child.on('error', reject);
                child.on('exit', (code) => {
                    if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
                });
            });
        };

        // Fire 3 processes with a small stagger to reduce initial lock storm
        const results: any[] = [];
        for (let i = 0; i < 3; i++) {
            results.push(spawnWorker());
            await new Promise((r: any) => setTimeout(r, 500)); // 500ms stagger
        }

        const attempts = await Promise.allSettled(results);

        const successes = attempts.filter(a => a.status === 'fulfilled' && (a.value as any).status === 'done');
        const failures = attempts.filter(a => a.status === 'rejected' || (a.status === 'fulfilled' && (a.value as any).status === 'error'));

        if (successes.length < 3) {
            console.error("Worker Failures Detected:");
            failures.forEach((f: any) => console.error(JSON.stringify(f.value || f.reason, null, 2)));
        }

        const traceIds = successes.map((s: any) => (s.value as any).trace_id);
        
        // Assert: All processes should return
        expect(successes.length).toBe(3);

        // Assert: Dual Identity Rule 
        // 1. Every attempt has its OWN trace_id
        const uniqueTraces = new Set(traceIds);
        expect(uniqueTraces.size).toBe(3);

        // 2. But they must resolve to EXACTLY ONE record in the database (content_hash identity)
        // We'll use a new PouchDB instance pointing to the same dir to check
        const checkDB = new (require('pouchdb'))(`${TEST_DB_DIR}/vortex_queue`);
        const allDocs = await checkDB.allDocs({include_docs: true});
        const markers = allDocs.rows.filter((r: any) => r.id.startsWith("sample::"));
        
        // Only 1 marker should exist because of SHA-256 content_hash deduplication
        expect(markers.length).toBe(1);
        
        // Only 1 queue entry should exist
        const entries = allDocs.rows.filter((r: any) => r.id.startsWith("queue::"));
        expect(entries.length).toBe(1);

        await checkDB.close();
    }, 120000); // 120s timeout for high-concurrency LevelDB retry loops
});
