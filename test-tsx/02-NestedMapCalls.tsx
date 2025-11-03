/**
 * Edge Case Test: Nested .map() Calls
 *
 * Tests double and triple nested .map() to verify loop template extraction
 * Key Issue: Loop template system may not handle nested iteration correctly
 */

import { useState } from 'minimact';

interface Item {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  items: Item[];
}

interface Department {
  id: number;
  name: string;
  categories: Category[];
}

export function NestedMapCalls() {
  const [categories] = useState<Category[]>([
    {
      id: 1,
      name: 'Electronics',
      items: [
        { id: 101, name: 'Laptop' },
        { id: 102, name: 'Mouse' },
        { id: 103, name: 'Keyboard' }
      ]
    },
    {
      id: 2,
      name: 'Books',
      items: [
        { id: 201, name: 'Fiction' },
        { id: 202, name: 'Non-Fiction' }
      ]
    }
  ]);

  const [departments] = useState<Department[]>([
    {
      id: 1,
      name: 'Store',
      categories: [
        {
          id: 10,
          name: 'Clothing',
          items: [
            { id: 1001, name: 'Shirt' },
            { id: 1002, name: 'Pants' }
          ]
        },
        {
          id: 20,
          name: 'Shoes',
          items: [
            { id: 2001, name: 'Sneakers' },
            { id: 2002, name: 'Boots' }
          ]
        }
      ]
    }
  ]);

  return (
    <div>
      <h1>Nested .map() Test Cases</h1>

      {/* Test Case 1: Double Nested .map() */}
      <div className="test-case">
        <h3>Test 1: Double Nested (Categories → Items)</h3>
        <div className="categories">
          {categories.map(category => (
            <div key={category.id} className="category">
              <h4>{category.name}</h4>
              <ul>
                {category.items.map(item => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Test Case 2: Triple Nested .map() */}
      <div className="test-case">
        <h3>Test 2: Triple Nested (Departments → Categories → Items)</h3>
        <div className="departments">
          {departments.map(dept => (
            <div key={dept.id} className="department">
              <h3>{dept.name}</h3>
              {dept.categories.map(cat => (
                <div key={cat.id} className="category">
                  <h4>{cat.name}</h4>
                  <ul>
                    {cat.items.map(item => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Test Case 3: Nested .map() with Index */}
      <div className="test-case">
        <h3>Test 3: Nested with Index Parameters</h3>
        {categories.map((category, catIndex) => (
          <div key={category.id}>
            <h4>{catIndex + 1}. {category.name}</h4>
            <ul>
              {category.items.map((item, itemIndex) => (
                <li key={item.id}>
                  {catIndex + 1}.{itemIndex + 1} - {item.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Test Case 4: Nested .map() with Event Handlers */}
      <div className="test-case">
        <h3>Test 4: Nested with Event Handlers</h3>
        {categories.map(category => (
          <div key={category.id}>
            <button onClick={() => alert(`Category: ${category.name}`)}>
              {category.name}
            </button>
            <div>
              {category.items.map(item => (
                <button key={item.id} onClick={() => alert(`Item: ${item.name}`)}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Test Case 5: Nested .map() with Conditionals */}
      <div className="test-case">
        <h3>Test 5: Nested with Conditionals</h3>
        {categories.map(category => (
          <div key={category.id}>
            <h4>{category.name}</h4>
            {category.items.length > 0 && (
              <ul>
                {category.items.map(item => (
                  <li key={item.id}>
                    {item.name}
                    {item.id > 200 && <span> (New!)</span>}
                  </li>
                ))}
              </ul>
            )}
            {category.items.length === 0 && <p>No items</p>}
          </div>
        ))}
      </div>

      {/* Test Case 6: Nested .map() with Inline Expressions */}
      <div className="test-case">
        <h3>Test 6: Nested with Inline Calculations</h3>
        {categories.map((category, catIdx) => (
          <div key={category.id}>
            <h4>Category {catIdx + 1}: {category.name}</h4>
            <p>Total Items: {category.items.length}</p>
            {category.items.map((item, itemIdx) => (
              <div key={item.id}>
                Item #{itemIdx + 1} of {category.items.length}: {item.name}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
