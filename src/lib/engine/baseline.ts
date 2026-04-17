import { SYSTEM_CONSTANTS } from "../constants";

type SignalValue = number;

export function median(values: SignalValue[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeMAD(values: SignalValue[], med: number): number {
    if (values.length === 0) return 0;
    const absoluteDeviations = values.map(v => Math.abs(v - med));
    return median(absoluteDeviations);
}

export function computeMean(values: SignalValue[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeStdDev(values: SignalValue[], mean: number): number {
    if (values.length <= 1) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

export function detectContamination(values: SignalValue[]): boolean {
    if (values.length === 0) return false;
    
    const med = median(values);
    const mad = computeMAD(values, med);

    if (Math.abs(med) > SYSTEM_CONSTANTS.EPSILON_ZERO_GUARD) {
        return (mad / Math.abs(med)) > SYSTEM_CONSTANTS.KAPPA_RELATIVE_MAD;
    } else {
        return mad > SYSTEM_CONSTANTS.TAU_ABS_MAD;
    }
}

export interface BaselineResult {
    type: 'mean' | 'median';
    mean?: number;
    stddev?: number;
    med?: number;
    mad?: number;
    robust_sigma: number;
    robust_center: number;
}

export function computeBaseline(values: SignalValue[]): BaselineResult {
    const isContaminated = detectContamination(values);

    if (isContaminated) {
        const med = median(values);
        const mad = computeMAD(values, med);
        const robust_sigma = 1.4826 * mad;
        
        return {
            type: 'median',
            med,
            mad,
            robust_center: med,
            robust_sigma
        };
    } else {
        const mean = computeMean(values);
        const stddev = computeStdDev(values, mean);

        return {
            type: 'mean',
            mean,
            stddev,
            robust_center: mean,
            robust_sigma: stddev
        };
    }
}
