import { SYSTEM_CONSTANTS } from "../constants";
import { SignalID } from "../ingestion/queue";
import { BaselineResult, computeBaseline } from "./baseline";
import { computeIntrinsicConfidence, computeReinforcedConfidence } from "./confidence";

export interface ComputationResult {
  signal_id: SignalID;
  ts_norm: number;
  baseline: BaselineResult;
  deviation: { value: number; z_score: number };
  anomaly_flag: boolean | 'warning';
  confidence: number; 
  correlation: Array<{
    signal_id: SignalID;
    strength: number;
    lag_offset: number;
  }>;
}

export function processWindow(
    signal_id: SignalID, 
    ts_now_utc: number, 
    ts_latest_norm: number, 
    values: number[], 
    expected_samples: number
): Partial<ComputationResult> {
    
    let baseline: BaselineResult;
    let confidence = 0;
    let z_score = 0;
    let anomaly_flag: boolean | 'warning' = false;
    let deviation = { value: 0, z_score: 0 };
    
    if (values.length < 10) { // N_min_baseline = 10
        // Compute baseline anyway for reference, but force confidence to 0
        baseline = computeBaseline(values);
        confidence = 0;
        deviation = { value: values[values.length - 1] ?? 0, z_score: 0 };
        return {
             signal_id,
             ts_norm: ts_latest_norm,
             baseline,
             deviation,
             anomaly_flag: false,
             confidence: 0,
             correlation: []
        };
    }

    baseline = computeBaseline(values);
    
    const latest_val = values[values.length - 1];

    const confResult = computeIntrinsicConfidence({
        ts_latest_norm,
        ts_now_utc,
        robust_sigma: baseline.robust_sigma,
        value: latest_val,
        robust_center: baseline.robust_center,
        expected_samples,
        actual_samples: values.length
    });

    z_score = confResult.z_score;
    anomaly_flag = confResult.anomaly_flag;
    confidence = confResult.confidence; // intrinsic
    deviation = { value: latest_val, z_score };

    return {
        signal_id,
        ts_norm: ts_latest_norm,
        baseline,
        deviation,
        anomaly_flag,
        confidence, // intrinsic computed, reinforcement applied later
        correlation: []
    };
}
