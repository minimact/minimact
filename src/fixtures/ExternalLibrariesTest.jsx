import { useState } from '@minimact/core';
import _ from 'lodash';
import moment from 'moment';
import 'bootstrap/dist/css/bootstrap.min.css';

/**
 * Test fixture to validate that external third-party libraries
 * are handled correctly during transpilation and runtime.
 *
 * Expected behavior:
 * 1. Transpilation: External imports should be preserved/ignored appropriately
 * 2. Client-side: Libraries should be bundled and executable in browser
 * 3. Server-side: C# should handle library calls gracefully (skip or mock)
 */
function ExternalLibrariesTest() {
  const [items, setItems] = useState([
    { id: 1, name: 'Apple', price: 1.20, created: '2024-01-15' },
    { id: 2, name: 'Banana', price: 0.50, created: '2024-01-16' },
    { id: 3, name: 'Cherry', price: 3.00, created: '2024-01-17' },
    { id: 4, name: 'Date', price: 2.50, created: '2024-01-18' },
  ]);

  const [sortOrder, setSortOrder] = useState('asc');

  // Using lodash for sorting
  const sortedItems = _.orderBy(items, ['price'], [sortOrder]);

  // Using lodash for calculations
  const totalPrice = _.sumBy(items, 'price');
  const avgPrice = _.meanBy(items, 'price');
  const cheapestItem = _.minBy(items, 'price');

  // Using lodash for filtering
  const expensiveItems = _.filter(items, item => item.price > 1.00);

  // Using moment for date formatting
  const formatDate = (dateStr) => {
    return moment(dateStr).format('MMM DD, YYYY');
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="container mt-4">
      <h1 className="display-4">External Libraries Test</h1>

      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Statistics (via lodash)</h5>
          <p className="card-text">Total: ${totalPrice.toFixed(2)}</p>
          <p className="card-text">Average: ${avgPrice.toFixed(2)}</p>
          <p className="card-text">Cheapest: {cheapestItem?.name}</p>
          <p className="card-text">Expensive items: {expensiveItems.length}</p>
        </div>
      </div>

      <button onClick={toggleSort} className="btn btn-primary mb-3">
        Sort: {sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
      </button>

      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>{formatDate(item.created)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ExternalLibrariesTest;
