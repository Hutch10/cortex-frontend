import { computeBaseline, computeMAD, median, detectContamination } from "../../src/lib/engine/baseline";

describe("Baseline Engine Tests", () => {
    describe("median calculation", () => {
        it("computes median correctly for odd length", () => {
            expect(median([1, 5, 3])).toBe(3);
        });
        it("computes median correctly for even length", () => {
            expect(median([1, 5, 3, 2])).toBe(2.5); // sorted: 1, 2, 3, 5 -> (2+3)/2 
        });
        it("computes zero for empty array", () => {
            expect(median([])).toBe(0);
        });
    });

    describe("MAD calculation", () => {
        it("computes MAD correctly", () => {
            expect(computeMAD([1, 1, 2, 2, 4, 6, 9], 2)).toBe(1);
        });
        it("computes zero for empty array", () => {
            expect(computeMAD([], 0)).toBe(0);
        });
    });

    describe("contamination detection", () => {
        it("detects contamination (outlier spike)", () => {
            // normal ~ 1-5, spike at 50
            const values = [1, 2, 3, 2, 1, 1, 2, 50]; 
            // med = 1.5, abs dev: 0.5, 0.5, 1.5, 0.5, 0.5, 0.5, 0.5, 48.5
            // sorted abs dev: 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5, 48.5 -> med of abs = 0.5
            // MAD = 0.5. med = 1.5. mad / med = 0.5 / 1.5 = 0.33. wait, that's not contaminated by MAD/med?
            // Actually, outlier spike increases MAD. Wait, a single outlier doesn't increase MAD much.
            // Contamination is when MAD is very large relative to Median.
            // Let's create a very noisy sequence.
            const noisy = [1, 10, -5, 20, 0, 0, 5, -15];
            expect(detectContamination(noisy)).toBe(true);
        });

        it("detects contamination when median near zero", () => {
            const values = [0, 0.05, -0.05, 0.02, -0.02, 0, 0.04];
            expect(detectContamination(values)).toBe(true);
        });

        it("does NOT detect contamination for clean normal case", () => {
            const values = [10, 10.1, 9.9, 10, 10.2, 9.8];
            expect(detectContamination(values)).toBe(false);
        });
        
        it("does NOT detect contamination for zero variance case", () => {
            const values = [10, 10, 10, 10, 10];
            expect(detectContamination(values)).toBe(false);
        });
    });

    describe("computeBaseline paths", () => {
        it("uses mean/stddev path for clean data", () => {
            const res = computeBaseline([10, 10, 10]);
            expect(res.type).toBe('mean');
            expect(res.robust_center).toBe(10);
            expect(res.robust_sigma).toBe(0);
        });

        it("uses median/MAD path for contaminated data", () => {
            const res = computeBaseline([-10, 10, -20, 20, 0, 0]);
            expect(res.type).toBe('median');
            expect(res.med).toBe(0);
        });
    });
});
