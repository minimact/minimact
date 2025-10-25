using System;
using System.Collections;
using System.Collections.Generic;

namespace Minimact.Workers
{
    /// <summary>
    /// JavaScript-compatible types for transpiler targeting.
    ///
    /// These types provide 1:1 mapping to JavaScript/TypeScript equivalents,
    /// ensuring perfect algorithm parity between C# (WPF MockClient) and
    /// TypeScript (browser web workers).
    /// </summary>

    /// <summary>
    /// JavaScript Map wrapper for transpiler targeting.
    /// Transpiles to: Map&lt;K, V&gt;
    ///
    /// Use this instead of Dictionary&lt;K,V&gt; in worker code.
    /// </summary>
    public class JsMap<K, V> : IEnumerable<KeyValuePair<K, V>>
    {
        private readonly Dictionary<K, V> _inner = new Dictionary<K, V>();

        /// <summary>Get value by key (transpiles to: map.get(key))</summary>
        public V Get(K key) => _inner[key];

        /// <summary>Set value by key (transpiles to: map.set(key, value))</summary>
        public void Set(K key, V value) => _inner[key] = value;

        /// <summary>Check if key exists (transpiles to: map.has(key))</summary>
        public bool Has(K key) => _inner.ContainsKey(key);

        /// <summary>Delete key (transpiles to: map.delete(key))</summary>
        public bool Delete(K key) => _inner.Remove(key);

        /// <summary>Clear all entries (transpiles to: map.clear())</summary>
        public void Clear() => _inner.Clear();

        /// <summary>Get number of entries (transpiles to: map.size)</summary>
        public int Size => _inner.Count;

        /// <summary>Iteration support (transpiles to: for (const [k, v] of map))</summary>
        public IEnumerator<KeyValuePair<K, V>> GetEnumerator() => _inner.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        /// <summary>Constructor</summary>
        public JsMap() { }
    }

    /// <summary>
    /// JavaScript Array wrapper for transpiler targeting.
    /// Transpiles to: Array&lt;T&gt;
    ///
    /// Use this instead of List&lt;T&gt; in worker code.
    /// Provides JavaScript array methods (map, filter, reduce, etc.)
    /// </summary>
    public class JsArray<T> : IEnumerable<T>
    {
        private readonly List<T> _inner = new List<T>();

        /// <summary>Add element to end (transpiles to: array.push(item))</summary>
        public void Push(T item) => _inner.Add(item);

        /// <summary>Remove and return last element (transpiles to: array.pop())</summary>
        public T Pop()
        {
            if (_inner.Count == 0)
                throw new InvalidOperationException("Cannot pop from empty array");
            var item = _inner[_inner.Count - 1];
            _inner.RemoveAt(_inner.Count - 1);
            return item;
        }

        /// <summary>Get array length (transpiles to: array.length)</summary>
        public int Length => _inner.Count;

        /// <summary>Array indexer (transpiles to: array[index])</summary>
        public T this[int index]
        {
            get => _inner[index];
            set => _inner[index] = value;
        }

        /// <summary>Slice from start to end (transpiles to: array.slice(start, end))</summary>
        public JsArray<T> Slice(int start, int end)
        {
            var result = new JsArray<T>();
            int actualStart = start < 0 ? Math.Max(0, _inner.Count + start) : start;
            int actualEnd = end < 0 ? Math.Max(0, _inner.Count + end) : Math.Min(end, _inner.Count);

            for (int i = actualStart; i < actualEnd; i++)
            {
                result.Push(_inner[i]);
            }
            return result;
        }

        /// <summary>Slice from start to end of array (transpiles to: array.slice(start))</summary>
        public JsArray<T> Slice(int start) => Slice(start, _inner.Count);

        /// <summary>Map elements (transpiles to: array.map(callback))</summary>
        public JsArray<U> map<U>(Func<T, U> callback)
        {
            var result = new JsArray<U>();
            foreach (var item in _inner)
                result.Push(callback(item));
            return result;
        }

        /// <summary>Filter elements (transpiles to: array.filter(callback))</summary>
        public JsArray<T> filter(Func<T, bool> callback)
        {
            var result = new JsArray<T>();
            foreach (var item in _inner)
                if (callback(item))
                    result.Push(item);
            return result;
        }

        /// <summary>Reduce to single value (transpiles to: array.reduce(callback, initialValue))</summary>
        public U reduce<U>(Func<U, T, U> callback, U initialValue)
        {
            var accumulator = initialValue;
            foreach (var item in _inner)
                accumulator = callback(accumulator, item);
            return accumulator;
        }

        /// <summary>Find first matching element (transpiles to: array.find(predicate))</summary>
        public T find(Func<T, bool> predicate)
        {
            foreach (var item in _inner)
                if (predicate(item))
                    return item;
            return default(T);
        }

        /// <summary>Find index of first match (transpiles to: array.findIndex(predicate))</summary>
        public int findIndex(Func<T, bool> predicate)
        {
            for (int i = 0; i < _inner.Count; i++)
                if (predicate(_inner[i]))
                    return i;
            return -1;
        }

        /// <summary>Check if any element matches (transpiles to: array.some(predicate))</summary>
        public bool some(Func<T, bool> predicate)
        {
            foreach (var item in _inner)
                if (predicate(item))
                    return true;
            return false;
        }

        /// <summary>Check if all elements match (transpiles to: array.every(predicate))</summary>
        public bool every(Func<T, bool> predicate)
        {
            foreach (var item in _inner)
                if (!predicate(item))
                    return false;
            return true;
        }

        /// <summary>ForEach iteration (transpiles to: array.forEach(callback))</summary>
        public void forEach(Action<T> callback)
        {
            foreach (var item in _inner)
                callback(item);
        }

        /// <summary>Get index of element (transpiles to: array.indexOf(item))</summary>
        public int indexOf(T item) => _inner.IndexOf(item);

        /// <summary>Check if array includes element (transpiles to: array.includes(item))</summary>
        public bool includes(T item) => _inner.Contains(item);

        /// <summary>Iteration support (transpiles to: for (const item of array))</summary>
        public IEnumerator<T> GetEnumerator() => _inner.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        /// <summary>Constructor</summary>
        public JsArray() { }

        /// <summary>Constructor with capacity</summary>
        public JsArray(int capacity) { _inner.Capacity = capacity; }
    }

    /// <summary>
    /// JavaScript Set wrapper for transpiler targeting.
    /// Transpiles to: Set&lt;T&gt;
    ///
    /// Use this for unique value collections in worker code.
    /// </summary>
    public class JsSet<T> : IEnumerable<T>
    {
        private readonly HashSet<T> _inner = new HashSet<T>();

        /// <summary>Add element (transpiles to: set.add(item))</summary>
        public void Add(T item) => _inner.Add(item);

        /// <summary>Check if element exists (transpiles to: set.has(item))</summary>
        public bool Has(T item) => _inner.Contains(item);

        /// <summary>Delete element (transpiles to: set.delete(item))</summary>
        public bool Delete(T item) => _inner.Remove(item);

        /// <summary>Clear all elements (transpiles to: set.clear())</summary>
        public void Clear() => _inner.Clear();

        /// <summary>Get number of elements (transpiles to: set.size)</summary>
        public int Size => _inner.Count;

        /// <summary>Iteration support (transpiles to: for (const item of set))</summary>
        public IEnumerator<T> GetEnumerator() => _inner.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        /// <summary>Constructor</summary>
        public JsSet() { }
    }
}
