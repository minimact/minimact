/**
 * Test fixture for usePaginatedServerTask hook
 * usePaginatedServerTask creates paginated data fetching with automatic count queries
 * Generates both a fetch task and a count task
 */

import { usePaginatedServerTask, useState } from '@minimact/core';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface OrderItem {
  id: number;
  orderId: string;
  product: string;
  quantity: number;
  total: number;
  date: string;
}

export function TestUsePaginatedServerTask() {
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Basic paginated task
  const {
    data: products,
    totalCount: productCount,
    isLoading: productsLoading,
    fetchPage: fetchProducts,
    totalPages: productPages
  } = usePaginatedServerTask<Product>(
    async function fetchProducts(page: number, pageSize: number, filter?: string): Promise<Product[]> {
      const response = await fetch(`/api/products?page=${page}&size=${pageSize}&category=${filter || ''}`);
      return response.json();
    },
    async function countProducts(filter?: string): Promise<number> {
      const response = await fetch(`/api/products/count?category=${filter || ''}`);
      return response.json();
    },
    { pageSize: 10, filter: categoryFilter }
  );

  // Paginated task with search
  const {
    data: orders,
    totalCount: orderCount,
    isLoading: ordersLoading,
    fetchPage: fetchOrders
  } = usePaginatedServerTask<OrderItem>(
    async function fetchOrders(page: number, pageSize: number, search?: string): Promise<OrderItem[]> {
      const response = await fetch(`/api/orders?page=${page}&size=${pageSize}&search=${search || ''}`);
      return response.json();
    },
    async function countOrders(search?: string): Promise<number> {
      const response = await fetch(`/api/orders/count?search=${search || ''}`);
      return response.json();
    },
    { pageSize: 20, filter: searchTerm }
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    fetchOrders(1);
  };

  return (
    <div className="paginated-task-test">
      <h2>Paginated Server Task Test</h2>

      <section className="products-section">
        <h3>Products</h3>

        <div className="filters">
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="books">Books</option>
          </select>
        </div>

        {productsLoading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <>
            <div className="product-list">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <h4>{product.name}</h4>
                  <p className="price">${product.price.toFixed(2)}</p>
                  <span className="category">{product.category}</span>
                </div>
              ))}
            </div>

            <div className="pagination">
              <span>Total: {productCount} products</span>
              <div className="page-buttons">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {productPages}</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= productPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="orders-section">
        <h3>Orders</h3>

        <div className="search">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search orders..."
          />
        </div>

        {ordersLoading ? (
          <div className="loading">Loading orders...</div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderId}</td>
                  <td>{order.product}</td>
                  <td>{order.quantity}</td>
                  <td>${order.total.toFixed(2)}</td>
                  <td>{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="order-count">
          Showing {orders.length} of {orderCount} orders
        </div>
      </section>
    </div>
  );
}
