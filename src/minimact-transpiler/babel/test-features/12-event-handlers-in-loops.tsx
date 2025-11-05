/**
 * Feature Test: Event Handlers in Loops
 *
 * Tests event handlers that capture loop variables (closures).
 *
 * Pattern: array.map(item => <button onClick={() => func(item)} />)
 */

export function EventHandlersInLoopsTest() {
  const categories = [
    {
      id: 1,
      name: 'Electronics',
      items: [
        { id: 101, name: 'Laptop' },
        { id: 102, name: 'Mouse' }
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

  function handleCategoryClick(categoryName: string) {
    console.log('Category:', categoryName);
  }

  function handleItemClick(itemName: string) {
    console.log('Item:', itemName);
  }

  return (
    <div>
      {/* Event handler capturing category */}
      {categories.map(category => (
        <div key={category.id}>
          <button onClick={() => handleCategoryClick(category.name)}>
            {category.name}
          </button>
          <div>
            {/* Nested event handler capturing item */}
            {category.items.map(item => (
              <button key={item.id} onClick={() => handleItemClick(item.name)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Event handler with alert (inline) */}
      {categories.map(category => (
        <div key={category.id}>
          <button onClick={() => alert(`Category: ${category.name}`)}>
            {category.name}
          </button>
        </div>
      ))}

      {/* Event handler capturing index */}
      {categories.map((category, index) => (
        <button key={category.id} onClick={() => console.log(`Index: ${index}`)}>
          {category.name} (#{index})
        </button>
      ))}
    </div>
  );
}
