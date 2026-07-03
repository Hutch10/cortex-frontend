const { enqueueSample } = require('../../src/lib/ingestion/queue');
const { DeterministicTestClock } = require('../../src/lib/engine/clock');
const { closeDBs } = require('../../src/lib/db/client');

process.on('unhandledRejection', (reason) => {
    process.send?.({ status: 'error', message: `Unhandled Rejection: ${reason}` });
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    process.send?.({ status: 'error', message: `Uncaught Exception: ${err.message}`, stack: err.stack });
    process.exit(1);
});

async function runWorker() {
    const dbDirArg = process.argv.find(a => a.startsWith('--db-dir='));
    if (dbDirArg) {
        process.env.VORTEX_DB_DIR = dbDirArg.split('=')[1];
    }

    const [,, source, ts, value, clockNow] = process.argv;
    const clock = new DeterministicTestClock(parseInt(clockNow));
    
    // Initial jitter
    await new Promise((r: any) => setTimeout(r, Math.random() * 5000));
    
    for (let attempts = 0; attempts < 50; attempts++) {
        try {
            await closeDBs();
            const { trace_id } = await enqueueSample(source, ts, { value: parseFloat(value) }, clock);
            process.send?.({ status: 'done', trace_id });
            return;
        } catch (e: any) {
            const msg = (e.message || '').toLowerCase();
            if (msg.includes('lock') || msg.includes('busy') || msg.includes('io error')) {
                await new Promise((r: any) => setTimeout(r, 1000 + Math.random() * 2000));
                continue;
            }
            // If it's a conflict but we got the trace_id, that's a partial success for our proof
            if (e.status === 409 && e.trace_id) {
               process.send?.({ status: 'done', trace_id: e.trace_id });
               return;
            }
            process.send?.({ status: 'error', message: e.message, stack: e.stack });
            process.exit(1);
        }
    }
    process.send?.({ status: 'error', message: 'Max retries reached' });
    process.exit(1);
}

runWorker();
