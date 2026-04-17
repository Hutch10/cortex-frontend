import { describe, it, expect } from "vitest";
import { median, computeMean, detectContamination } from "../../src/lib/engine/baseline";
import { computeReinforcedConfidence, computeIntrinsicConfidence } from "../../src/lib/engine/confidence";
import { computePearsonAtLag, computeMaxCorrelation, SignalData } from "../../src/lib/engine/correlation";
import { processWindow } from "../../src/lib/engine/window";

describe("Engine Branch Coverage Expansion", () => {
    
    it("hits baseline.ts empty branches", () => {
        expect(median([])).toBe(0);
        expect(computeMean([])).toBe(0);
        expect(detectContamination([])).toBe(false);
    });

    it("hits confidence.ts reinforced empty branches", () => {
        expect(computeReinforcedConfidence(0.5, [])).toBe(0.25);
        expect(computeReinforcedConfidence(0.5, [{ intrinsic: 0, correlation: 1 }])).toBe(0.25);
    });

    it("hits correlation.ts pearson zero denominator branch", () => {
        const sigA: SignalData = {
            id: 'A', timestamps: Array.from({length: 20}, (_, i) => i * 60000), 
            values: Array.from({length: 20}, () => 10), 
            baseline: { type: 'mean', robust_center: 10, robust_sigma: 0 } 
        };
        const sigB: SignalData = {
            id: 'B', timestamps: Array.from({length: 20}, (_, i) => i * 60000), 
            values: Array.from({length: 20}, () => 10), 
            baseline: { type: 'mean', robust_center: 10, robust_sigma: 0 }
        };
        expect(computePearsonAtLag(sigA, sigB, 0)).toBe(0);
    });

    it("hits correlation.ts max tie-breaking branch", () => {
        // Provide 15+ samples to pass the MIN_SAMPLES_CORR check
        const timestamps = Array.from({length: 20}, (_, i) => i * 60000);
        const sigA: SignalData = {
            id: 'A', timestamps, values: timestamps.map((_, i) => i % 2), 
            baseline: { type: 'mean', robust_center: 0.5, robust_sigma: 0.5 }
        };
        const sigB: SignalData = {
            id: 'B', timestamps: Array.from({length: 30}, (_, i) => (i - 5) * 60000), 
            values: Array.from({length: 30}, (_, i) => i % 2), 
            baseline: { type: 'mean', robust_center: 0.5, robust_sigma: 0.5 }
        };
        const res = computeMaxCorrelation(sigA, sigB);
        expect(res).toBeDefined();
    });

    it("hits window.ts empty values fallback", () => {
        const res = processWindow('hrv', 1000, 1000, [], 15);
        expect(res.deviation!.value).toBe(0);
    });

    it("hits confidence.ts z-score epsilon guard", () => {
        const res = computeIntrinsicConfidence({
            ts_latest_norm: 1000, ts_now_utc: 1000,
            robust_sigma: 0, value: 5, robust_center: 0,
            expected_samples: 15, actual_samples: 15
        });
        expect(res.z_score).toBeGreaterThan(1e6);
    });
});
