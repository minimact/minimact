use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Global metrics collector
pub struct Metrics {
    // Reconciliation metrics
    pub reconcile_calls: AtomicU64,
    pub reconcile_errors: AtomicU64,
    pub total_patches_generated: AtomicU64,
    pub reconcile_total_time_us: AtomicU64,

    // Predictor metrics
    pub predictor_learns: AtomicU64,
    pub predictor_learn_errors: AtomicU64,
    pub predictor_predictions: AtomicU64,
    pub predictor_prediction_hits: AtomicU64,
    pub predictor_prediction_misses: AtomicU64,
    pub predictor_total_time_us: AtomicU64,

    // Memory metrics
    pub current_predictors: AtomicUsize,
    pub max_predictors: AtomicUsize,
    pub evictions_performed: AtomicU64,

    // Validation metrics
    pub validation_failures: AtomicU64,
    pub patches_validated: AtomicU64,
    pub patch_validation_failures: AtomicU64,

    // Performance tracking
    start_time: Instant,

    // Recent operation timings (circular buffer)
    recent_reconcile_times: Mutex<Vec<u64>>,
    recent_prediction_times: Mutex<Vec<u64>>,
    max_recent_samples: usize,
}

lazy_static::lazy_static! {
    pub static ref METRICS: Metrics = Metrics::new();
}

impl Metrics {
    fn new() -> Self {
        Self {
            reconcile_calls: AtomicU64::new(0),
            reconcile_errors: AtomicU64::new(0),
            total_patches_generated: AtomicU64::new(0),
            reconcile_total_time_us: AtomicU64::new(0),

            predictor_learns: AtomicU64::new(0),
            predictor_learn_errors: AtomicU64::new(0),
            predictor_predictions: AtomicU64::new(0),
            predictor_prediction_hits: AtomicU64::new(0),
            predictor_prediction_misses: AtomicU64::new(0),
            predictor_total_time_us: AtomicU64::new(0),

            current_predictors: AtomicUsize::new(0),
            max_predictors: AtomicUsize::new(0),
            evictions_performed: AtomicU64::new(0),

            validation_failures: AtomicU64::new(0),
            patches_validated: AtomicU64::new(0),
            patch_validation_failures: AtomicU64::new(0),

            start_time: Instant::now(),

            recent_reconcile_times: Mutex::new(Vec::new()),
            recent_prediction_times: Mutex::new(Vec::new()),
            max_recent_samples: 1000,
        }
    }

    pub fn record_reconcile(&self, duration: Duration, patch_count: usize, error: bool) {
        self.reconcile_calls.fetch_add(1, Ordering::Relaxed);

        if error {
            self.reconcile_errors.fetch_add(1, Ordering::Relaxed);
        } else {
            self.total_patches_generated.fetch_add(patch_count as u64, Ordering::Relaxed);
        }

        let micros = duration.as_micros() as u64;
        self.reconcile_total_time_us.fetch_add(micros, Ordering::Relaxed);

        // Store recent timing
        let mut times = self.recent_reconcile_times.lock().unwrap();
        if times.len() >= self.max_recent_samples {
            times.remove(0);
        }
        times.push(micros);
    }

    pub fn record_prediction(&self, duration: Duration, hit: bool) {
        self.predictor_predictions.fetch_add(1, Ordering::Relaxed);

        if hit {
            self.predictor_prediction_hits.fetch_add(1, Ordering::Relaxed);
        } else {
            self.predictor_prediction_misses.fetch_add(1, Ordering::Relaxed);
        }

        let micros = duration.as_micros() as u64;
        self.predictor_total_time_us.fetch_add(micros, Ordering::Relaxed);

        // Store recent timing
        let mut times = self.recent_prediction_times.lock().unwrap();
        if times.len() >= self.max_recent_samples {
            times.remove(0);
        }
        times.push(micros);
    }

    pub fn record_learn(&self, error: bool) {
        self.predictor_learns.fetch_add(1, Ordering::Relaxed);
        if error {
            self.predictor_learn_errors.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn record_predictor_created(&self) {
        let current = self.current_predictors.fetch_add(1, Ordering::Relaxed) + 1;

        // Update max if needed
        let mut max = self.max_predictors.load(Ordering::Relaxed);
        while current > max {
            match self.max_predictors.compare_exchange_weak(
                max,
                current,
                Ordering::Relaxed,
                Ordering::Relaxed,
            ) {
                Ok(_) => break,
                Err(new_max) => max = new_max,
            }
        }
    }

    pub fn record_predictor_destroyed(&self) {
        self.current_predictors.fetch_sub(1, Ordering::Relaxed);
    }

    pub fn record_eviction(&self) {
        self.evictions_performed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_validation_failure(&self) {
        self.validation_failures.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_patch_validation(&self, success: bool) {
        self.patches_validated.fetch_add(1, Ordering::Relaxed);
        if !success {
            self.patch_validation_failures.fetch_add(1, Ordering::Relaxed);
        }
    }

    /// Get snapshot of all metrics
    pub fn snapshot(&self) -> MetricsSnapshot {
        let reconcile_times = self.recent_reconcile_times.lock().unwrap();
        let prediction_times = self.recent_prediction_times.lock().unwrap();

        let avg_reconcile_us = if !reconcile_times.is_empty() {
            reconcile_times.iter().sum::<u64>() / reconcile_times.len() as u64
        } else {
            0
        };

        let avg_prediction_us = if !prediction_times.is_empty() {
            prediction_times.iter().sum::<u64>() / prediction_times.len() as u64
        } else {
            0
        };

        let p95_reconcile_us = percentile(&reconcile_times, 0.95);
        let p95_prediction_us = percentile(&prediction_times, 0.95);

        let total_predictions = self.predictor_predictions.load(Ordering::Relaxed);
        let hit_rate = if total_predictions > 0 {
            self.predictor_prediction_hits.load(Ordering::Relaxed) as f64 / total_predictions as f64
        } else {
            0.0
        };

        MetricsSnapshot {
            uptime_secs: self.start_time.elapsed().as_secs(),

            reconcile_calls: self.reconcile_calls.load(Ordering::Relaxed),
            reconcile_errors: self.reconcile_errors.load(Ordering::Relaxed),
            total_patches_generated: self.total_patches_generated.load(Ordering::Relaxed),
            avg_reconcile_time_us: avg_reconcile_us,
            p95_reconcile_time_us: p95_reconcile_us,

            predictor_learns: self.predictor_learns.load(Ordering::Relaxed),
            predictor_learn_errors: self.predictor_learn_errors.load(Ordering::Relaxed),
            predictor_predictions: total_predictions,
            predictor_prediction_hits: self.predictor_prediction_hits.load(Ordering::Relaxed),
            predictor_prediction_misses: self.predictor_prediction_misses.load(Ordering::Relaxed),
            prediction_hit_rate: hit_rate,
            avg_prediction_time_us: avg_prediction_us,
            p95_prediction_time_us: p95_prediction_us,

            current_predictors: self.current_predictors.load(Ordering::Relaxed),
            max_predictors: self.max_predictors.load(Ordering::Relaxed),
            evictions_performed: self.evictions_performed.load(Ordering::Relaxed),

            validation_failures: self.validation_failures.load(Ordering::Relaxed),
            patches_validated: self.patches_validated.load(Ordering::Relaxed),
            patch_validation_failures: self.patch_validation_failures.load(Ordering::Relaxed),
        }
    }

    /// Reset all metrics
    pub fn reset(&self) {
        self.reconcile_calls.store(0, Ordering::Relaxed);
        self.reconcile_errors.store(0, Ordering::Relaxed);
        self.total_patches_generated.store(0, Ordering::Relaxed);
        self.reconcile_total_time_us.store(0, Ordering::Relaxed);

        self.predictor_learns.store(0, Ordering::Relaxed);
        self.predictor_learn_errors.store(0, Ordering::Relaxed);
        self.predictor_predictions.store(0, Ordering::Relaxed);
        self.predictor_prediction_hits.store(0, Ordering::Relaxed);
        self.predictor_prediction_misses.store(0, Ordering::Relaxed);
        self.predictor_total_time_us.store(0, Ordering::Relaxed);

        self.evictions_performed.store(0, Ordering::Relaxed);

        self.validation_failures.store(0, Ordering::Relaxed);
        self.patches_validated.store(0, Ordering::Relaxed);
        self.patch_validation_failures.store(0, Ordering::Relaxed);

        self.recent_reconcile_times.lock().unwrap().clear();
        self.recent_prediction_times.lock().unwrap().clear();
    }
}

/// Calculate percentile from sorted values
fn percentile(values: &[u64], p: f64) -> u64 {
    if values.is_empty() {
        return 0;
    }

    let mut sorted = values.to_vec();
    sorted.sort_unstable();

    let index = ((sorted.len() as f64) * p) as usize;
    sorted[index.min(sorted.len() - 1)]
}

/// Snapshot of metrics at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub uptime_secs: u64,

    // Reconciliation
    pub reconcile_calls: u64,
    pub reconcile_errors: u64,
    pub total_patches_generated: u64,
    pub avg_reconcile_time_us: u64,
    pub p95_reconcile_time_us: u64,

    // Prediction
    pub predictor_learns: u64,
    pub predictor_learn_errors: u64,
    pub predictor_predictions: u64,
    pub predictor_prediction_hits: u64,
    pub predictor_prediction_misses: u64,
    pub prediction_hit_rate: f64,
    pub avg_prediction_time_us: u64,
    pub p95_prediction_time_us: u64,

    // Memory
    pub current_predictors: usize,
    pub max_predictors: usize,
    pub evictions_performed: u64,

    // Validation
    pub validation_failures: u64,
    pub patches_validated: u64,
    pub patch_validation_failures: u64,
}

/// FFI functions for metrics
#[no_mangle]
pub unsafe extern "C" fn minimact_metrics_get() -> *mut std::os::raw::c_char {
    use std::ffi::CString;

    let snapshot = METRICS.snapshot();
    match serde_json::to_string(&snapshot) {
        Ok(json) => CString::new(json).unwrap().into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "C" fn minimact_metrics_reset() {
    METRICS.reset();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reconcile_metrics() {
        let metrics = Metrics::new();

        metrics.record_reconcile(Duration::from_micros(100), 5, false);
        metrics.record_reconcile(Duration::from_micros(200), 3, false);
        metrics.record_reconcile(Duration::from_micros(150), 0, true);

        assert_eq!(metrics.reconcile_calls.load(Ordering::Relaxed), 3);
        assert_eq!(metrics.reconcile_errors.load(Ordering::Relaxed), 1);
        assert_eq!(metrics.total_patches_generated.load(Ordering::Relaxed), 8);
    }

    #[test]
    fn test_prediction_metrics() {
        let metrics = Metrics::new();

        metrics.record_prediction(Duration::from_micros(50), true);
        metrics.record_prediction(Duration::from_micros(60), true);
        metrics.record_prediction(Duration::from_micros(40), false);

        let snapshot = metrics.snapshot();
        assert_eq!(snapshot.predictor_predictions, 3);
        assert_eq!(snapshot.predictor_prediction_hits, 2);
        assert_eq!(snapshot.predictor_prediction_misses, 1);
        assert_eq!(snapshot.prediction_hit_rate, 2.0 / 3.0);
    }

    #[test]
    fn test_percentile() {
        let values = vec![10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        let p50 = percentile(&values, 0.5);
        let p95 = percentile(&values, 0.95);
        // p50 should be around middle, p95 should be near top
        assert!(p50 >= 40 && p50 <= 60);
        assert!(p95 >= 90 && p95 <= 100);
    }
}
