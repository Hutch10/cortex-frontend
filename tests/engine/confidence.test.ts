import { computeIntrinsicConfidence, computeReinforcedConfidence } from "../../src/lib/engine/confidence";
import { SYSTEM_CONSTANTS } from "../../src/lib/constants";

describe("Confidence Engine Tests", () => {
    describe("intrinsic confidence", () => {
        it("computes normal case properly", () => {
            const now = Date.now();
            const res = computeIntrinsicConfidence({
                ts_latest_norm: now,
                ts_now_utc: now,
                robust_sigma: 1,
                value: 10,
                robust_center: 10,
                expected_samples: 10,
                actual_samples: 10
            });
            // F=1, V=0.5, A=1, D=1 -> C=0.5
            expect(res.confidence).toBe(0.5);
            expect(res.z_score).toBe(0);
            expect(res.anomaly_flag).toBe(false);
        });

        it("penalizes staleness", () => {
            const now = Date.now();
            const res = computeIntrinsicConfidence({
                ts_latest_norm: now - 300000, // 5 min out
                ts_now_utc: now,
                robust_sigma: 1,
                value: 10,
                robust_center: 10,
                expected_samples: 10,
                actual_samples: 10
            });
            // F=0
            expect(res.confidence).toBe(0);
        });

        it("handles zero-variance case properly", () => {
            const now = Date.now();
            const res = computeIntrinsicConfidence({
                ts_latest_norm: now,
                ts_now_utc: now,
                robust_sigma: 0,
                value: 10,
                robust_center: 10,
                expected_samples: 10,
                actual_samples: 10
            });
            // V = 1. A = 1. C = 1.
            expect(res.confidence).toBe(1);
            expect(res.z_score).toBe(0);
        });

        it("flags outliers correctly", () => {
            const now = Date.now();
            const res = computeIntrinsicConfidence({
                ts_latest_norm: now,
                ts_now_utc: now,
                robust_sigma: 1,
                value: 15,
                robust_center: 10,
                expected_samples: 10,
                actual_samples: 10
            });
            // z = 5. A = 0.
            expect(res.z_score).toBe(5);
            expect(res.anomaly_flag).toBe(true);
            expect(res.confidence).toBe(0);
        });
    });

    describe("reinforced confidence", () => {
        it("lambda scales correctly based on intrinsic", () => {
            const finalC = computeReinforcedConfidence(0.5, [
                { intrinsic: 0.8, correlation: 0.9 }
            ]);
            // lambda = 0.5. R = 0.9.  0.5 * (0.5 + 0.5 * 0.9) = 0.5 * 0.95 = 0.475
            expect(finalC).toBeCloseTo(0.475);
        });

        it("correlation=0 doesn't zero out confidence", () => {
            const finalC = computeReinforcedConfidence(0.5, [
                { intrinsic: 0.8, correlation: 0.0 }
            ]);
            // R = 0. -> 0.5 * (0.5 + 0) = 0.25
            expect(finalC).toBe(0.25);
        });
        
        it("weights correlations by cross-signal confidence", () => {
             const c1 = computeReinforcedConfidence(0.5, [
                 { intrinsic: 1.0, correlation: 0.8 },
                 { intrinsic: 0.1, correlation: 0.0 }
             ]);
             // sum_w = 1.1. weighted_sum = 0.8. R = 0.727
             // 0.5 * (0.5 + 0.5 * 0.727) = 0.5 * 0.863 = 0.4318
             expect(c1).toBeCloseTo(0.4318);
        });
    });
});
