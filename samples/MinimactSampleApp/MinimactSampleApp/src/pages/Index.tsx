import { useState } from '@minimact/core';

export function Index() {
    const [count, setCount] = useState(0);

    return (
        <div className="counter">
            <h1>Welcome to Minimact!</h1>
            <h2>Counter Example</h2>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <button onClick={() => setCount(count - 1)}>Decrement</button>
            <button onClick={() => setCount(0)}>Reset</button>
        </div>
    );
}
