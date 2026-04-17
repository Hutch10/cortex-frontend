import { SYSTEM_CONSTANTS } from "../constants";

export interface ConfidenceParams {
    ts_latest_norm: number;
    ts_now_utc: number;
    robust_sigma: number;
    value: number;
    robust_center: number;
    expected_samples: number;
    actual_samples: number;
}

export function computeIntrinsicConfidence(params: ConfidenceParams): { confidence: number, z_score: number, anomaly_flag: boolean | 'warning' } {
    // 1. Freshness Factor (F)
    const dt_seconds = Math.max(0, (params.ts_now_utc - params.ts_latest_norm) / 1000);
    const t_fresh = 300; // 5 mins
    const F = Math.max(0, 1 - (dt_seconds / t_fresh));

    // 2. Variance Quality (V)
    const V = 1 / (1 + params.robust_sigma);

    // 3. Anomaly Magnitude (A)
    let z_score = 0;
    if (params.robust_sigma <= SYSTEM_CONSTANTS.EPSILON_ZERO_GUARD) {
         z_score = (params.value - params.robust_center) / 1e-9;
    } else {
         z_score = (params.value - params.robust_center) / params.robust_sigma;
    }
    
    const abs_z = Math.abs(z_score);
    const A = Math.max(0, 1 - (abs_z / SYSTEM_CONSTANTS.Z_MAX));

    // Determine flag
    let anomaly_flag: boolean | 'warning' = false;
    if (abs_z > 3) anomaly_flag = true;
    else if (abs_z > 2) anomaly_flag = 'warning';

    // 4. Data Completeness (D)
    const D = Math.min(1, Math.max(0, params.actual_samples / params.expected_samples));

    // Final intrinsic 
    const C_int = F * V * A * D;

    return { confidence: C_int, z_score, anomaly_flag };
}

export function computeReinforcedConfidence(intrinsic_confidence: number, other_signals: Array<{ intrinsic: number, correlation: number }>): number {
    const lambda = Math.min(1, intrinsic_confidence);

    let R = 0;
    
    if (other_signals.length > 0) {
        let weighted_sum = 0;
        let sum_weights = 0;
        
        for (const sig of other_signals) {
            weighted_sum += sig.intrinsic * Math.abs(sig.correlation);
            sum_weights += sig.intrinsic;
        }

        if (sum_weights > 0) {
            R = weighted_sum / sum_weights;
        }
    }

    const final_C = intrinsic_confidence * ((1 - lambda) + (lambda * R));
    return Math.max(0, Math.min(1, final_C));
}
