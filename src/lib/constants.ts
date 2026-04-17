export const SYSTEM_CONSTANTS = Object.freeze({
  // Anomaly constraints
  Z_MAX: 5.0,
  
  // Cross-signal correlation constraints
  LAG_WINDOW: 5,           // +/- 5 intervals
  MIN_SAMPLES_CORR: 15,    // Mminimum overlapping samples for correlation
  CORR_THRESHOLD: 0.30,    // Minimum absolute Pearson correlation
  
  // Ingestion and missing data boundaries
  INTERVAL_MS: 60000,      // 60 seconds
  MAX_GAP_INTERVALS: 3,    // 3 intervals acceptable out-of-order delay
  MAX_WAIT_MS: 360000,     // 2 * MAX_GAP * INTERVAL_MS
  
  // Math constants
  EPSILON_ZERO_GUARD: 1e-6, // Used to guard division by zero
  KAPPA_RELATIVE_MAD: 0.5,  // Threshold for relative dispersion (MAD/med)
  TAU_ABS_MAD: 0.01,        // Absolute lower bound for MAD when median ~ 0
  
  // Ledger and storage definitions
  HASH_ALGO: 'SHA-256',
  SIGNATURE_ALGO: 'Ed25519',
});

// Deep freeze to ensure complete immutability
Object.freeze(SYSTEM_CONSTANTS);
