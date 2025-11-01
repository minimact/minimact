// CounterPage.tsx - Demonstrates MVC Bridge with basic mutable state
import { useMvcState, useMvcViewModel } from '@minimact/mvc';
import { useState } from '@minimact/core';

interface CounterViewModel {
    userName: string;
    canReset: boolean;
    lastResetTime: string;
    initialCount: number;
    initialStep: number;
    initialShowHistory: boolean;
    pageTitle: string;
    description: string;
}

export function CounterPage() {
    // ❌ IMMUTABLE - Server authority (read-only)
    const [userName] = useMvcState<string>('userName');
    const [canReset] = useMvcState<boolean>('canReset');
    const [lastResetTime] = useMvcState<string>('lastResetTime');

    // ✅ MUTABLE - Client can modify (syncs to server)
    const [count, setCount] = useMvcState<number>('initialCount', {
        sync: 'immediate' // Sync every change immediately
    });

    const [step, setStep] = useMvcState<number>('initialStep', {
        sync: 'debounced',
        syncDelay: 300 // Debounce input changes
    });

    const [showHistory, setShowHistory] = useMvcState<boolean>('initialShowHistory');

    // Access entire ViewModel
    const viewModel = useMvcViewModel<CounterViewModel>();

    // Local state for history (not synced to server)
    const [history, setHistory] = useState<Array<{ value: number; timestamp: Date; action: string }>>([]);

    const handleIncrement = () => {
        const newCount = count + step;
        setCount(newCount);
        addToHistory(newCount, `+${step}`);
    };

    const handleDecrement = () => {
        const newCount = count - step;
        setCount(newCount);
        addToHistory(newCount, `-${step}`);
    };

    const handleReset = () => {
        setCount(0);
        addToHistory(0, 'Reset');
    };

    const addToHistory = (value: number, action: string) => {
        setHistory([
            { value, timestamp: new Date(), action },
            ...history.slice(0, 9) // Keep last 10 entries
        ]);
    };

    if (!viewModel) {
        return <div>Loading...</div>;
    }

    return (
        <div className="page-container">
            {/* Header */}
            <header className="page-header">
                <h1>🔢 {viewModel.pageTitle}</h1>
                <p className="description">{viewModel.description}</p>
                <div className="user-info">
                    <span className="user-badge">👤 {userName}</span>
                    <span className="timestamp">
                        Last reset: {new Date(lastResetTime).toLocaleString()}
                    </span>
                </div>
            </header>

            {/* Counter Display */}
            <div className="counter-display">
                <div className="count-value">{count}</div>
                <div className="count-label">Current Count</div>
            </div>

            {/* Controls */}
            <div className="counter-controls">
                <button
                    className="btn btn-decrement"
                    onClick={handleDecrement}
                >
                    - {step}
                </button>

                <button
                    className="btn btn-increment"
                    onClick={handleIncrement}
                >
                    + {step}
                </button>
            </div>

            {/* Step Control */}
            <div className="step-control">
                <label htmlFor="step-input">Step Size:</label>
                <input
                    id="step-input"
                    type="number"
                    value={step}
                    min="1"
                    onChange={(e) => setStep(parseInt(e.target.value) || 1)}
                    className="step-input"
                />
            </div>

            {/* Reset Button */}
            {canReset && (
                <div className="reset-section">
                    <button className="btn btn-reset" onClick={handleReset}>
                        Reset to 0
                    </button>
                </div>
            )}

            {/* History Toggle */}
            <div className="history-toggle">
                <label>
                    <input
                        type="checkbox"
                        checked={showHistory}
                        onChange={(e) => setShowHistory(e.target.checked)}
                    />
                    <span>Show History</span>
                </label>
            </div>

            {showHistory && (
                <div className="history-panel">
                    <h3>📜 History</h3>
                    {history.length === 0 ? (
                        <p className="empty-message">No changes yet. Try clicking the buttons!</p>
                    ) : (
                        <ul className="history-list">
                            {history.map((entry, i) => (
                                <li key={i} className="history-item">
                                    <span className="history-action">{entry.action}</span>
                                    <span className="history-value">{entry.value}</span>
                                    <span className="history-time">
                                        {entry.timestamp.toLocaleTimeString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Info Panel */}
            <div className="info-panel">
                <h3>ℹ️ How This Works</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <h4>❌ Immutable (Server Authority)</h4>
                        <ul>
                            <li><code>userName</code> - User identity</li>
                            <li><code>canReset</code> - Permission</li>
                            <li><code>lastResetTime</code> - Server timestamp</li>
                        </ul>
                        <p className="note">
                            These values come from the server and cannot be modified from the client.
                            No setter is returned from <code>useMvcState()</code>.
                        </p>
                    </div>

                    <div className="info-item">
                        <h4>✅ Mutable (Client Control)</h4>
                        <ul>
                            <li><code>[Mutable] initialCount</code> - Counter value</li>
                            <li><code>[Mutable] initialStep</code> - Step size</li>
                            <li><code>[Mutable] initialShowHistory</code> - UI toggle</li>
                        </ul>
                        <p className="note">
                            These values can be modified by the client and automatically sync to the server
                            via SignalR. Changes are validated server-side.
                        </p>
                    </div>
                </div>

                <div className="sync-info">
                    <h4>🔄 Sync Strategies</h4>
                    <ul>
                        <li><strong>count:</strong> <code>immediate</code> - Syncs instantly on every change</li>
                        <li><strong>step:</strong> <code>debounced (300ms)</code> - Waits 300ms after typing</li>
                        <li><strong>showHistory:</strong> <code>immediate</code> (default)</li>
                    </ul>
                </div>
            </div>

            {/* Debug Info */}
            <details className="debug-panel">
                <summary>🔍 Debug: View ViewModel JSON</summary>
                <pre>{JSON.stringify(viewModel, null, 2)}</pre>
                <h4 style={{ marginTop: '1rem' }}>Mutability Metadata:</h4>
                <pre>{JSON.stringify((window as any).__MINIMACT_VIEWMODEL__?._mutability, null, 2)}</pre>
            </details>
        </div>
    );
}
