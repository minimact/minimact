/**
 * Edge Case Test: Computed Properties in Loops
 *
 * Tests computed property access patterns in .map() calls
 * Key Issue: loopTemplates.cjs:162 returns null for computed properties
 * Status: ❌ KNOWN NOT SUPPORTED
 */

import { useState } from '@minimact/core';

interface DataRow {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface Translation {
  [key: string]: string;
}

export function ComputedPropertiesInLoops() {
  const [items] = useState<DataRow[]>([
    { id: 1, name: 'Widget A', price: 10.99, stock: 50, category: 'Tools' },
    { id: 2, name: 'Widget B', price: 15.99, stock: 30, category: 'Hardware' },
    { id: 3, name: 'Widget C', price: 20.99, stock: 0, category: 'Tools' }
  ]);

  const [selectedField, setSelectedField] = useState<'name' | 'category'>('name');
  const [sortBy, setSortBy] = useState<'price' | 'stock'>('price');

  const [translations] = useState<Translation>({
    name: 'Name',
    price: 'Price',
    stock: 'Stock',
    category: 'Category'
  });

  return (
    <div>
      <h1>Computed Properties in Loops (EXPECTED TO FAIL)</h1>
      <p className="warning">⚠️ These patterns are NOT supported by the babel plugin!</p>

      {/* Test Case 1: Direct computed property access - WILL FAIL */}
      <div className="test-case error">
        <h3>Test 1: Direct Computed Property (item[dynamicKey])</h3>
        <p>Status: ❌ NOT SUPPORTED</p>
        <div className="code-sample">
          {items.map(item => (
            <div key={item.id}>
              {/* This will fail template extraction: */}
              Value: {item[selectedField]}
            </div>
          ))}
        </div>
      </div>

      {/* Test Case 2: Computed property in sorting - WILL FAIL */}
      <div className="test-case error">
        <h3>Test 2: Sorting with Computed Key</h3>
        <p>Status: ❌ NOT SUPPORTED</p>
        <div className="code-sample">
          {items.map(item => (
            <div key={item.id}>
              Sort Value: {item[sortBy]}
            </div>
          ))}
        </div>
      </div>

      {/* Test Case 3: Translation lookup - WILL FAIL */}
      <div className="test-case error">
        <h3>Test 3: Translation Lookup</h3>
        <p>Status: ❌ NOT SUPPORTED</p>
        <div>
          {Object.keys(translations).map(key => (
            <div key={key}>
              {/* translations[key] is computed access */}
              {key}: {translations[key]}
            </div>
          ))}
        </div>
      </div>

      {/* WORKAROUNDS - These WILL work */}
      <div className="workarounds">
        <h2>✅ Working Workarounds</h2>

        {/* Workaround 1: Pre-compute the value */}
        <div className="test-case success">
          <h3>Workaround 1: Pre-compute Value Outside JSX</h3>
          <p>Status: ✅ WORKS</p>
          {items.map(item => {
            // Pre-compute before JSX
            const displayValue = item[selectedField];
            return (
              <div key={item.id}>
                Value: {displayValue}
              </div>
            );
          })}
        </div>

        {/* Workaround 2: Use explicit conditionals */}
        <div className="test-case success">
          <h3>Workaround 2: Explicit Conditional</h3>
          <p>Status: ✅ WORKS</p>
          {items.map(item => (
            <div key={item.id}>
              Value: {selectedField === 'name' ? item.name : item.category}
            </div>
          ))}
        </div>

        {/* Workaround 3: Use helper function */}
        <div className="test-case success">
          <h3>Workaround 3: Helper Function</h3>
          <p>Status: ✅ WORKS</p>
          {items.map(item => (
            <div key={item.id}>
              Value: {getFieldValue(item, selectedField)}
            </div>
          ))}
        </div>

        {/* Workaround 4: Map to new structure first */}
        <div className="test-case success">
          <h3>Workaround 4: Transform Data First</h3>
          <p>Status: ✅ WORKS</p>
          {items.map(item => ({ ...item, displayValue: item[selectedField] })).map(item => (
            <div key={item.id}>
              Value: {item.displayValue}
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div className="controls">
        <h3>Test Controls</h3>
        <select value={selectedField} onChange={(e) => setSelectedField(e.target.value as any)}>
          <option value="name">Name</option>
          <option value="category">Category</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
        </select>
      </div>
    </div>
  );
}

// Helper function for workaround 3
function getFieldValue(item: DataRow, field: 'name' | 'category'): string {
  return item[field];
}
