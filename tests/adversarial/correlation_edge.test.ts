import { computeMaxCorrelation, SignalData } from "../../src/lib/engine/correlation";
import { SYSTEM_CONSTANTS } from "../../src/lib/constants";

describe("Correlation Engine Edge Cases", () => {
    const mockBaseline = {
        robust_center: 0,
        robust_sigma: 1,
        mad: 0.67,
        mean: 0,
        type: 'median' as const
    };

    it("returns null when correlation is below threshold (Line 73)", () => {
        const n = 100;
        const timestamps = Array.from({length: n}, (_, i) => 1000 + i * 60000);
        const valuesA = timestamps.map((_, i) => i % 2 === 0 ? 1 : -1);
        const valuesB = timestamps.map((_, i) => i % 3 === 0 ? 1 : -1); // Uncorrelated phase

        const sigA: SignalData = { id: 'A', timestamps, values: valuesA, baseline: mockBaseline };
        const sigB: SignalData = { id: 'B', timestamps, values: valuesB, baseline: mockBaseline };
        
        const result = computeMaxCorrelation(sigA, sigB);
        expect(result).toBeNull();
    });

    it("returns successful result when correlation is above threshold (Line 76)", () => {
        const n = 20;
        const timestamps = Array.from({length: n}, (_, i) => 1000 + i * 60000);
        const values = Array.from({length: n}, (_, i) => i);

        const sigA: SignalData = { id: 'A', timestamps, values, baseline: { ...mockBaseline, robust_center: 10, robust_sigma: 5.77 } };
        const sigB: SignalData = { id: 'B', timestamps, values, baseline: { ...mockBaseline, robust_center: 10, robust_sigma: 5.77 } };
        
        const result = computeMaxCorrelation(sigA, sigB);
        expect(result).not.toBeNull();
        expect(result!.strength).toBeGreaterThan(0.9);
    });

    it("returns null when overlap is too small (Line 29)", () => {
        const sigA: SignalData = {
            id: 'A',
            timestamps: [1000, 2000, 3000, 4000, 5000],
            values: [1, 2, 3, 4, 5],
            baseline: mockBaseline
        };
        const sigB: SignalData = {
            id: 'B',
            timestamps: [1000, 2000, 3000, 4000, 5000],
            values: [1, 2, 3, 4, 5],
            baseline: mockBaseline
        };
        const res = computeMaxCorrelation(sigA, sigB);
        expect(res).toBeNull();
    });

    it("handles zero variance in first signal (Line 41 branch)", () => {
        const n = 20;
        const timestamps = Array.from({length: n}, (_, i) => 1000 + i * 60000);
        const sigA: SignalData = {
            id: 'A',
            timestamps,
            values: Array.from({length: n}, () => 10),
            baseline: { ...mockBaseline, robust_center: 10, robust_sigma: 0 }
        };
        const sigB: SignalData = {
            id: 'B',
            timestamps,
            values: Array.from({length: n}, (_, i) => 10 + i),
            baseline: { ...mockBaseline, robust_center: 20, robust_sigma: 5 }
        };
        const res = computeMaxCorrelation(sigA, sigB);
        expect(res).toBeNull();
    });
});
