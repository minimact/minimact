// Namespace: Minimact.Workers

export class JsMap {
    private _inner: Map<K, V>;
    get(key: K): V {
    }

    set(key: K, value: V): void {
    }

    has(key: K): boolean {
    }

    delete(key: K): boolean {
    }

    clear(): void {
    }

    getEnumerator(): IEnumerator<KeyValuePair<K, V>> {
    }

    getEnumerator(): IEnumerator {
    }

    constructor() {
    }

}

export class JsArray {
    private _inner: Array<T>;
    push(item: T): void {
    }

    pop(): T {
        if (_inner.length === 0) {
        }
        const item = _inner[_inner.length - 1];
        _inner.removeAt(_inner.length - 1);
        return item;
    }

    slice(start: number, end: number): Array<T> {
        const result = new Array<T>();
        const actualStart: number = start < 0 ? Math.max(0, _inner.length + start) : start;
        const actualEnd: number = end < 0 ? Math.max(0, _inner.length + end) : Math.min(end, _inner.length);
        for (let i = actualStart; i < actualEnd; i++) {
            result.push(_inner[i]);
        }
        return result;
    }

    slice(start: number): Array<T> {
    }

    map(callback: Func<T, U>): Array<U> {
        const result = new Array<U>();
        for (const item of _inner) {
            result.push(callback(item));
        }
        return result;
    }

    filter(callback: Func<T, boolean>): Array<T> {
        const result = new Array<T>();
        for (const item of _inner) {
            if (callback(item)) {
                result.push(item);
            }
        }
        return result;
    }

    reduce(callback: Func<U, T, U>, initialValue: U): U {
        const accumulator = initialValue;
        for (const item of _inner) {
            accumulator = callback(accumulator, item);
        }
        return accumulator;
    }

    find(predicate: Func<T, boolean>): T {
        for (const item of _inner) {
            if (predicate(item)) {
                return item;
            }
        }
        return /* TODO: DefaultExpressionSyntax */;
    }

    findIndex(predicate: Func<T, boolean>): number {
        for (let i = 0; i < _inner.length; i++) {
            if (predicate(_inner[i])) {
                return i;
            }
        }
        return -1;
    }

    some(predicate: Func<T, boolean>): boolean {
        for (const item of _inner) {
            if (predicate(item)) {
                return true;
            }
        }
        return false;
    }

    every(predicate: Func<T, boolean>): boolean {
        for (const item of _inner) {
            if (!predicate(item)) {
                return false;
            }
        }
        return true;
    }

    forEach(callback: Action<T>): void {
        for (const item of _inner) {
            callback(item);
        }
    }

    indexOf(item: T): number {
    }

    includes(item: T): boolean {
    }

    getEnumerator(): IEnumerator<T> {
    }

    getEnumerator(): IEnumerator {
    }

    constructor() {
    }

    constructor(capacity: number) {
        _inner.capacity = capacity;
    }

}

export class JsSet {
    private _inner: HashSet<T>;
    add(item: T): void {
    }

    has(item: T): boolean {
    }

    delete(item: T): boolean {
    }

    clear(): void {
    }

    getEnumerator(): IEnumerator<T> {
    }

    getEnumerator(): IEnumerator {
    }

    constructor() {
    }

}

