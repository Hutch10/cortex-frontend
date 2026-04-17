import { SYSTEM_CONSTANTS } from "../constants";
import { BaselineResult } from "./baseline";

export interface SignalData {
    id: string;
    timestamps: number[];
    values: number[];
    baseline: BaselineResult;
}

export function computePearsonAtLag(sigA: SignalData, sigB: SignalData, lagMin: number): number | null {
    const overlappingPairs: Array<[number, number]> = [];
    
    // Convert to maps for O(1) alignment lookups
    const bValuesMap = new Map<number, number>();
    sigB.timestamps.forEach((ts, idx) => {
        bValuesMap.set(ts, sigB.values[idx]);
    });

    // Align to nearest minute boundaries explicitly
    sigA.timestamps.forEach((tsA, idxA) => {
        const offsetTs = tsA + (lagMin * SYSTEM_CONSTANTS.INTERVAL_MS);
        if (bValuesMap.has(offsetTs)) {
             overlappingPairs.push([sigA.values[idxA], bValuesMap.get(offsetTs)!]);
        }
    });

    if (overlappingPairs.length < SYSTEM_CONSTANTS.MIN_SAMPLES_CORR) {
        return null;
    }

    let numerator = 0;
    
    // We must use the robust baselines to prevent outlier distortion
    const muA = sigA.baseline.robust_center;
    const muB = sigB.baseline.robust_center;
    const sigmaA = sigA.baseline.robust_sigma;
    const sigmaB = sigB.baseline.robust_sigma;

    if (sigmaA <= SYSTEM_CONSTANTS.EPSILON_ZERO_GUARD || sigmaB <= SYSTEM_CONSTANTS.EPSILON_ZERO_GUARD) {
        return 0; // cannot correlate constants
    }

    overlappingPairs.forEach(([a, b]) => {
        numerator += (a - muA) * (b - muB);
    });

    const denominator = (overlappingPairs.length - 1) * sigmaA * sigmaB;
    if (denominator === 0) return 0;
    
    return numerator / denominator;
}

export function computeMaxCorrelation(sigA: SignalData, sigB: SignalData): { strength: number, lag_offset: number } | null {
    let bestLag = 0;
    let maxAbsCorr = -1;
    let actualCorr = 0;
    
    for (let lag = -SYSTEM_CONSTANTS.LAG_WINDOW; lag <= SYSTEM_CONSTANTS.LAG_WINDOW; lag++) {
        const p = computePearsonAtLag(sigA, sigB, lag);
        if (p !== null) {
            const absP = Math.abs(p);
            // Deterministic tie-breaking: favor smallest absolute lag 
            if (absP > maxAbsCorr || (absP === maxAbsCorr && Math.abs(lag) < Math.abs(bestLag))) {
                maxAbsCorr = absP;
                bestLag = lag;
                actualCorr = p;
            }
        }
    }

    if (maxAbsCorr < 0 || maxAbsCorr < SYSTEM_CONSTANTS.CORR_THRESHOLD) {
        return null;
    }

    return {
        strength: actualCorr,
        lag_offset: bestLag
    };
}
