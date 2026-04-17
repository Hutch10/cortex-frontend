import { computePearsonAtLag, computeMaxCorrelation, SignalData } from "../../src/lib/engine/correlation";
import { computeBaseline } from "../../src/lib/engine/baseline";
import { SYSTEM_CONSTANTS } from "../../src/lib/constants";

describe("Correlation Engine Tests", () => {
    function createMockSignal(values: number[]): SignalData {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1 || 1);
        const stddev = Math.sqrt(variance);

        return {
            id: 'mock',
            timestamps: values.map((_, i) => i * SYSTEM_CONSTANTS.INTERVAL_MS),
            values,
            baseline: {
                type: 'mean',
                robust_center: mean,
                robust_sigma: stddev,
                mean,
                stddev,
                med: mean,
                mad: stddev
            }
        };
    }

    it("requires minimum overlapping samples", () => {
        const sA = createMockSignal([1, 2, 3]);
        const sB = createMockSignal([1, 2, 3]);
        expect(computePearsonAtLag(sA, sB, 0)).toBeNull();
    });

    it("computes expected 1.0 correlation for identical signals", () => {
        const vals = Array.from({length: 20}, (_, i) => i);
        const sA = createMockSignal(vals);
        const sB = createMockSignal(vals);
        const corr = computePearsonAtLag(sA, sB, 0);
        expect(corr).toBeCloseTo(1.0, 1); 
    });

    it("computes expected -1.0 correlation for inverse signals", () => {
        const valsA = Array.from({length: 20}, (_, i) => i);
        const valsB = Array.from({length: 20}, (_, i) => 20 - i);
        const sA = createMockSignal(valsA);
        const sB = createMockSignal(valsB);
        const corr = computePearsonAtLag(sA, sB, 0);
        expect(corr).toBeCloseTo(-1.0, 1);
    });

    it("handles zero variance correctly", () => {
        const valsA = Array.from({length: 20}, () => 10);
        const valsB = Array.from({length: 20}, () => 5);
        const sA = createMockSignal(valsA);
        const sB = createMockSignal(valsB);
        const corr = computePearsonAtLag(sA, sB, 0);
        expect(corr).toBe(0);
    });

    it("finds max correlation with lag offset tie breaking", () => {
        const valsA = Array.from({length: 20}, (_, i) => Math.sin(i));
        const sA = createMockSignal(valsA);
        // B is shifted by 2 intervals ahead of A
        const sB = createMockSignal(valsA);
        sB.timestamps = sB.timestamps.map(t => t - 2 * SYSTEM_CONSTANTS.INTERVAL_MS);
        
        const res = computeMaxCorrelation(sA, sB);
        expect(res).not.toBeNull();
        expect(res!.lag_offset).toBe(-2);
    });
});
