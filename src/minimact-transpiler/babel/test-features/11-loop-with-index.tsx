/**
 * Feature Test: Loop with Index
 *
 * Tests array.map() with index parameter.
 *
 * Pattern: array.map((item, index) => ...)
 */

export function LoopWithIndexTest() {
  const categories = [
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
        { id: 201, name: 'JavaScript Guide' },
        { id: 202, name: 'React Handbook' }
      ]
    }
  ];

  return (
    <div>
      {/* Simple map with index */}
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

      {/* Index used in calculations */}
      {categories.map((category, index) => (
        <div key={category.id}>
          <h4>Section {index + 1} of {categories.length}</h4>
          <p>Category: {category.name}</p>
          <p>Position: {((index + 1) / categories.length * 100).toFixed(0)}%</p>
        </div>
      ))}

      {/* Index in nested loops */}
      {categories.map((category, catIndex) => (
        <div key={category.id}>
          <p>Category #{catIndex}</p>
          {category.items.map((item, itemIndex) => (
            <p key={item.id}>
              Item {catIndex}-{itemIndex}: {item.name}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
