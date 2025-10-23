import { useEffect, useState } from 'react';
import type { InteractionResponse } from '../types/playground';

interface PredictionOverlayProps {
  interaction: InteractionResponse;
}

/**
 * Shows prediction result with animated overlay
 * Green = Cache hit (instant)
 * Red = Cache miss (recomputed)
 */
export function PredictionOverlay({ interaction }: PredictionOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 2 seconds
    const timer = setTimeout(() => setIsVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const isCacheHit = interaction.cacheHit;
  const latency = interaction.elapsedMs;
  const confidence = (interaction.predictionConfidence * 100).toFixed(0);

  return (
    <div
      className={`
        fixed top-6 right-6 rounded-lg shadow-2xl p-4
        border-l-4 animate-in slide-in-from-right duration-300 z-50
        ${
          isCacheHit
            ? 'bg-green-50 border-l-green-500 text-green-900'
            : 'bg-red-50 border-l-red-500 text-red-900'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{isCacheHit ? '🟢' : '🔴'}</span>
        <div>
          <div className="font-bold text-lg">
            {isCacheHit ? 'Prediction Hit!' : 'Prediction Miss'}
          </div>
          <div className="text-sm font-mono font-bold">{latency}ms</div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {isCacheHit ? (
          <>
            <p className="flex items-center gap-2">
              <span>✅</span>
              <span>Cache hit - applied instantly</span>
            </p>
            <p className="flex items-center gap-2">
              <span>📊</span>
              <span>Confidence: {confidence}%</span>
            </p>
            <p className="text-xs opacity-75 mt-3">
              Patches were pre-computed and cached. No network round-trip needed!
            </p>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2">
              <span>❌</span>
              <span>Prediction was incorrect</span>
            </p>
            <p className="flex items-center gap-2">
              <span>⚡</span>
              <span>Re-rendered component</span>
            </p>
            <p className="text-xs opacity-75 mt-3">
              Prediction was wrong, but the system will learn from this interaction!
            </p>
          </>
        )}
      </div>

      {/* Footer tip */}
      {!isCacheHit && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-xs opacity-75">
            💡 Tip: Use usePredictHint() to help the predictor
          </p>
        </div>
      )}
    </div>
  );
}
