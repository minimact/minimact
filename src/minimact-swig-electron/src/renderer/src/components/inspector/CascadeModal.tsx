/**
 * CascadeModal Component
 *
 * Modal dialog for visualizing reactive cascade (wave-based state change propagation)
 */

import { useState } from 'react';
import type { ReactiveWave, PreviewCascadeResult, DOMPatchInfo } from '../../../../main/types/cascade';

interface CascadeModalProps {
  cascadeData: PreviewCascadeResult;
  onClose: () => void;
  onApply?: () => void;
}

export function CascadeModal({ cascadeData, onClose, onApply }: CascadeModalProps) {
  const [selectedWave, setSelectedWave] = useState<number | null>(null);

  return (
    <div className="cascade-modal-overlay" onClick={onClose}>
      <div className="cascade-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cascade-modal-header">
          <h2>Reactive Cascade Preview</h2>
          <button onClick={onClose} className="close-button">×</button>
        </header>

        <div className="cascade-stats">
          <div className="stat">
            <label>Total Waves:</label>
            <value className="stat-value">{cascadeData.totalWaves}</value>
          </div>
          <div className="stat">
            <label>Affected Elements:</label>
            <value className="stat-value">{cascadeData.totalAffectedElements}</value>
          </div>
          <div className="stat">
            <label>Computation Time:</label>
            <value className="stat-value">{cascadeData.computationTime.toFixed(2)}ms</value>
          </div>
          {cascadeData.hasCycle && (
            <div className="stat warning">
              <label>⚠️ Cycle Detected:</label>
              <value className="stat-value">Infinite loop possible!</value>
            </div>
          )}
        </div>

        <div className="cascade-timeline">
          {cascadeData.waves.map((wave, index) => (
            <WaveCard
              key={index}
              wave={wave}
              isSelected={selectedWave === index}
              onClick={() => setSelectedWave(index)}
            />
          ))}
        </div>

        {selectedWave !== null && cascadeData.waves[selectedWave] && (
          <WaveDetails wave={cascadeData.waves[selectedWave]} />
        )}

        <footer className="cascade-modal-footer">
          {onApply && (
            <button onClick={onApply} className="btn-primary">
              Apply Changes
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </footer>
      </div>

      <style>{`
        .cascade-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cascade-modal {
          background: #1e1e1e;
          border-radius: 8px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          color: #e0e0e0;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .cascade-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
        }

        .cascade-modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          color: #999;
          font-size: 32px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #333;
          color: #fff;
        }

        .cascade-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          padding: 20px;
          background: #252525;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #4ECDC4;
        }

        .stat.warning .stat-value {
          color: #ff6b6b;
        }

        .cascade-timeline {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .cascade-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #333;
        }

        .btn-primary, .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4ECDC4;
          color: #1e1e1e;
        }

        .btn-primary:hover {
          background: #45B7D1;
        }

        .btn-secondary {
          background: #333;
          color: #e0e0e0;
        }

        .btn-secondary:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}

interface WaveCardProps {
  wave: ReactiveWave;
  isSelected: boolean;
  onClick: () => void;
}

function WaveCard({ wave, isSelected, onClick }: WaveCardProps) {
  const color = getWaveColor(wave.waveNumber);
  const waveType = getWaveTypeName(wave.waveNumber);

  return (
    <div
      className={`wave-card ${isSelected ? 'selected' : ''} ${wave.isCycle ? 'cycle' : ''}`}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className="wave-header">
        <span className="wave-number" style={{ backgroundColor: color }}>
          Wave {wave.waveNumber}
        </span>
        <span className="wave-type">{waveType}</span>
        {wave.isCycle && (
          <span className="cycle-badge">⚠️ Cycle</span>
        )}
      </div>

      <div className="wave-body">
        <div className="wave-trigger">
          <label>Triggered by:</label>
          <code>{wave.triggeringState.join(', ')}</code>
        </div>

        {wave.affectedState.length > 0 && !wave.isCycle && (
          <div className="wave-affects">
            <label>Affects:</label>
            <code>{wave.affectedState.join(', ')}</code>
          </div>
        )}

        {wave.isCycle && (
          <div className="wave-cycle">
            <label>Cycle State:</label>
            <code>{wave.cycleState}</code>
          </div>
        )}

        {!wave.isCycle && (
          <div className="wave-elements">
            <label>DOM Changes:</label>
            <value>{wave.domElements.length} elements</value>
          </div>
        )}
      </div>

      <style>{`
        .wave-card {
          background: #252525;
          border-left: 4px solid;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wave-card:hover {
          background: #2a2a2a;
          transform: translateX(4px);
        }

        .wave-card.selected {
          background: #2d2d2d;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .wave-card.cycle {
          border-left-color: #ff6b6b !important;
        }

        .wave-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .wave-number {
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .wave-type {
          font-size: 14px;
          color: #999;
        }

        .cycle-badge {
          margin-left: auto;
          padding: 4px 8px;
          background: #ff6b6b;
          color: white;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .wave-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .wave-trigger,
        .wave-affects,
        .wave-cycle,
        .wave-elements {
          display: flex;
          gap: 8px;
          font-size: 13px;
        }

        .wave-trigger label,
        .wave-affects label,
        .wave-cycle label,
        .wave-elements label {
          color: #999;
          min-width: 100px;
        }

        .wave-trigger code,
        .wave-affects code,
        .wave-cycle code {
          color: #4ECDC4;
          background: #1a1a1a;
          padding: 2px 8px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }

        .wave-elements value {
          color: #e0e0e0;
        }
      `}</style>
    </div>
  );
}

interface WaveDetailsProps {
  wave: ReactiveWave;
}

function WaveDetails({ wave }: WaveDetailsProps) {
  if (wave.isCycle) {
    return (
      <div className="wave-details">
        <h3>Wave {wave.waveNumber} - Cycle Detected</h3>
        <div className="cycle-warning">
          <p>⚠️ A reactive cycle was detected. The state change would cause an infinite loop.</p>
          <p><strong>Cycle State:</strong> <code>{wave.cycleState}</code></p>
          <p>This typically happens when:</p>
          <ul>
            <li>A useEffect triggers a state change that re-triggers the same effect</li>
            <li>Multiple effects create a circular dependency</li>
            <li>A computed value depends on itself indirectly</li>
          </ul>
        </div>

        <style>{`
          .cycle-warning {
            background: #3a2020;
            border: 1px solid #ff6b6b;
            border-radius: 6px;
            padding: 16px;
            color: #ffb3b3;
          }

          .cycle-warning p {
            margin: 8px 0;
          }

          .cycle-warning code {
            background: #2a1a1a;
            padding: 2px 8px;
            border-radius: 3px;
            color: #ff6b6b;
          }

          .cycle-warning ul {
            margin: 8px 0;
            padding-left: 24px;
          }

          .cycle-warning li {
            margin: 4px 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="wave-details">
      <h3>Wave {wave.waveNumber} - Detailed Changes</h3>

      <table className="patches-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Type</th>
            <th>Selector</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {wave.domElements.map((patch, index) => (
            <tr key={index}>
              <td className="order-cell">{index + 1}</td>
              <td>
                <span className={`patch-type ${patch.type}`}>
                  {patch.type}
                </span>
              </td>
              <td>
                <code className="selector">{patch.selector}</code>
              </td>
              <td className="change-cell">
                <span className="old-value">{JSON.stringify(patch.oldValue)}</span>
                <span className="arrow">→</span>
                <span className="new-value">{JSON.stringify(patch.newValue)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .wave-details {
          padding: 20px;
          background: #252525;
          border-top: 1px solid #333;
        }

        .wave-details h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #4ECDC4;
        }

        .patches-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .patches-table th {
          text-align: left;
          padding: 12px;
          background: #1a1a1a;
          color: #999;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }

        .patches-table td {
          padding: 12px;
          border-bottom: 1px solid #333;
        }

        .patches-table tr:hover {
          background: #2a2a2a;
        }

        .order-cell {
          color: #999;
          font-family: 'Courier New', monospace;
        }

        .patch-type {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .patch-type.setText { background: #45B7D1; color: white; }
        .patch-type.setAttribute { background: #F7DC6F; color: #1e1e1e; }
        .patch-type.addClass { background: #F7DC6F; color: #1e1e1e; }
        .patch-type.removeClass { background: #FFA07A; color: #1e1e1e; }
        .patch-type.insertElement { background: #51cf66; color: white; }
        .patch-type.removeElement { background: #ff6b6b; color: white; }
        .patch-type.replaceElement { background: #BB8FCE; color: white; }

        .selector {
          color: #98D8C8;
          background: #1a1a1a;
          padding: 2px 8px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .change-cell {
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .old-value {
          color: #ff6b6b;
        }

        .arrow {
          color: #999;
          margin: 0 8px;
        }

        .new-value {
          color: #51cf66;
        }
      `}</style>
    </div>
  );
}

/**
 * Get color for wave based on index
 */
function getWaveColor(waveIndex: number): string {
  const colors = [
    '#FF6B6B',  // Red (Wave 0 - Primary)
    '#4ECDC4',  // Cyan (Wave 1 - Secondary)
    '#45B7D1',  // Blue (Wave 2 - Tertiary)
    '#FFA07A',  // Orange (Wave 3)
    '#98D8C8',  // Mint (Wave 4)
    '#F7DC6F',  // Yellow (Wave 5)
    '#BB8FCE'   // Purple (Wave 6+)
  ];
  return colors[Math.min(waveIndex, colors.length - 1)];
}

/**
 * Get wave type name for display
 */
function getWaveTypeName(waveNumber: number): string {
  switch (waveNumber) {
    case 0:
      return 'Primary';
    case 1:
      return 'Secondary';
    case 2:
      return 'Tertiary';
    default:
      return `${waveNumber}th Order`;
  }
}
