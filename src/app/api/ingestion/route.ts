import { NextResponse } from 'next/server';
import { enqueueSample, SignalID } from '@/lib/ingestion/queue';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.source || !body.ts_raw || body.payload === undefined) {
             return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const source = body.source as SignalID;
        await enqueueSample(source, body.ts_raw, body.payload);

        return NextResponse.json({ success: true, message: 'Sample queued' });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
