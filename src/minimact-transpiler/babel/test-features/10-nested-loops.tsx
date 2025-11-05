/**
 * Feature Test: Nested Loops (Double Nested .map())
 *
 * Tests nested array.map() calls for rendering hierarchical data.
 *
 * Pattern: array1.map(item1 => array2.map(item2 => ...))
 */

export function NestedLoopsTest() {
  const categories = [
    {
      id: 1,
      name: 'Electronics',
      items: [
        { id: 101, name: 'Laptop', price: 999 },
        { id: 102, name: 'Mouse', price: 29 },
        { id: 103, name: 'Keyboard', price: 79 }
      ]
    },
    {
      id: 2,
      name: 'Books',
      items: [
        { id: 201, name: 'JavaScript Guide', price: 39 },
        { id: 202, name: 'React Handbook', price: 49 }
      ]
    }
  ];

  return (
    <div>
      {/* Double nested map */}
      {categories.map(category => (
        <div key={category.id}>
          <h4>{category.name}</h4>
          <ul>
            {category.items.map(item => (
              <li key={item.id}>
                {item.name} - ${item.price}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Nested map with more complex JSX */}
      {categories.map(category => (
        <div key={category.id} style={{ marginBottom: '20px' }}>
          <h3>{category.name}</h3>
          <div>
            {category.items.map(item => (
              <div key={item.id} style={{ padding: '5px', border: '1px solid #ccc' }}>
                <strong>{item.name}</strong>
                <span> - ${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
