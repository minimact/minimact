/**
 * Example: csharpFile.cjs - Assembles final .cs file with usings/namespace
 */
import { useState, useEffect, useServerTask } from '@minimact/core';

interface Product {
  id: number;
  name: string;
  price: number;
}

export function CSharpFileExample() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useServerTask(async () => {
    const response = await fetch('/api/products');
    return await response.json();
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="product-list">
      {loading && <span>Loading...</span>}
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name}: ${p.price.toFixed(2)}</li>
        ))}
      </ul>
    </div>
  );
}
