import { useState, useEffect } from 'react'
import { X, Folder, File, Plus, Minus, AlertCircle } from 'lucide-react'

interface AddPageModalProps {
  isOpen: boolean
  onClose: () => void
  projectPath: string
  onPageCreated: () => void
}

interface RouteParameter {
  name: string
  optional: boolean
}

interface PageTemplate {
  id: string
  name: string
  description: string
  icon: string
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Page',
    description: 'Empty page with basic structure',
    icon: '📄'
  },
  {
    id: 'counter',
    name: 'Counter',
    description: 'Simple counter with useState example',
    icon: '🔢'
  },
  {
    id: 'punch',
    name: 'Minimact Punch',
    description: 'DOM-reactive page with useDomElementState',
    icon: '👊'
  },
  {
    id: 'query',
    name: 'Minimact Query',
    description: 'SQL-like queries for the DOM',
    icon: '🗃️'
  },
  {
    id: 'form',
    name: 'Form',
    description: 'Form with input handling',
    icon: '📝'
  },
  {
    id: 'list',
    name: 'List View',
    description: 'Display list of items with mapping',
    icon: '📋'
  },
  {
    id: 'crud',
    name: 'CRUD Page',
    description: 'Full CRUD operations example',
    icon: '⚙️'
  }
]

export default function AddPageModal({ isOpen, onClose, projectPath, onPageCreated }: AddPageModalProps) {
  const [pageName, setPageName] = useState('')
  const [folderPath, setFolderPath] = useState('Pages')
  const [customRoute, setCustomRoute] = useState('')
  const [useCustomRoute, setUseCustomRoute] = useState(false)
  const [parameters, setParameters] = useState<RouteParameter[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPageName('')
      setFolderPath('Pages')
      setCustomRoute('')
      setUseCustomRoute(false)
      setParameters([])
      setSelectedTemplate('blank')
      setError(null)
    }
  }, [isOpen])

  // Auto-generate route from page name
  const generatedRoute = useCustomRoute
    ? customRoute
    : `/${pageName.replace(/\s+/g, '-').toLowerCase()}`

  // Build full route with parameters
  const fullRoute = parameters.reduce((route, param) => {
    const paramStr = param.optional ? `{${param.name}?}` : `{${param.name}}`
    return `${route}/${paramStr}`
  }, generatedRoute)

  // Validate page name
  const validatePageName = (name: string): string | null => {
    if (!name.trim()) return 'Page name is required'
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      return 'Page name must start with uppercase letter and contain only letters and numbers'
    }
    return null
  }

  const handleAddParameter = () => {
    setParameters([...parameters, { name: '', optional: false }])
  }

  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }

  const handleParameterChange = (index: number, field: keyof RouteParameter, value: string | boolean) => {
    const updated = [...parameters]
    updated[index] = { ...updated[index], [field]: value }
    setParameters(updated)
  }

  const handleCreate = async () => {
    // Validate
    const nameError = validatePageName(pageName)
    if (nameError) {
      setError(nameError)
      return
    }

    // Validate parameters
    for (const param of parameters) {
      if (!param.name.trim()) {
        setError('All parameters must have a name')
        return
      }
      if (!/^[a-z][a-zA-Z0-9]*$/.test(param.name)) {
        setError('Parameter names must start with lowercase letter and contain only letters and numbers')
        return
      }
    }

    setCreating(true)
    setError(null)

    try {
      // Generate the TSX file content based on template
      const fileContent = generatePageContent(pageName, selectedTemplate, parameters)

      // Determine the full file path
      const fileName = `${pageName}.tsx`
      const fullPath = `${projectPath}/${folderPath}/${fileName}`

      // Create the file
      await window.api.file.write(fullPath, fileContent)

      // Create route configuration file (for custom routes and parameters)
      if (useCustomRoute || parameters.length > 0) {
        const routeConfig = {
          route: fullRoute,
          parameters: parameters.map(p => ({
            name: p.name,
            optional: p.optional
          }))
        }
        const configPath = fullPath.replace('.tsx', '.route.json')
        await window.api.file.write(configPath, JSON.stringify(routeConfig, null, 2))
      }

      // Transpile the new file
      await window.api.transpiler.transpileFile(fullPath)

      // Notify parent and close
      onPageCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create page')
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <File className="w-5 h-5 text-green-400" />
            Add New Page
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-500 rounded px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-200 text-sm">{error}</div>
            </div>
          )}

          {/* Page Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Page Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="e.g., ProductDetail, UserProfile, BlogPost"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Must start with uppercase letter (PascalCase)</p>
          </div>

          {/* Folder Path */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Folder Path
            </label>
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Pages"
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Relative to project root. Use / for nested folders (e.g., Pages/Admin/Users)
            </p>
          </div>

          {/* Custom Route */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="useCustomRoute"
                checked={useCustomRoute}
                onChange={(e) => setUseCustomRoute(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-green-500 focus:ring-green-500"
              />
              <label htmlFor="useCustomRoute" className="text-sm font-medium text-gray-300">
                Use Custom Route
              </label>
            </div>
            {useCustomRoute && (
              <input
                type="text"
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value)}
                placeholder="/custom/route/path"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            )}
          </div>

          {/* Route Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Route Parameters</label>
              <button
                onClick={handleAddParameter}
                className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 rounded flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Parameter
              </button>
            </div>

            {parameters.length === 0 ? (
              <div className="text-sm text-gray-500 italic py-2">
                No parameters. Click "Add Parameter" to add route parameters like {'{id}'} or {'{slug?}'}
              </div>
            ) : (
              <div className="space-y-2">
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-900 rounded p-2">
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                      placeholder="paramName"
                      className="flex-1 px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                    <label className="flex items-center gap-1 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={param.optional}
                        onChange={(e) => handleParameterChange(index, 'optional', e.target.checked)}
                        className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-green-500"
                      />
                      Optional?
                    </label>
                    <button
                      onClick={() => handleRemoveParameter(index)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Route Preview */}
          <div className="bg-gray-900 rounded p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Route Preview:</div>
            <div className="font-mono text-green-400 text-sm">
              {fullRoute || '/'}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              File: {folderPath}/{pageName}.tsx
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Page Template
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PAGE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedTemplate === template.id
                      ? 'border-green-500 bg-green-900/20'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{template.icon}</div>
                  <div className="font-medium text-white mb-1">{template.name}</div>
                  <div className="text-xs text-gray-400">{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !pageName.trim()}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded transition-colors font-medium"
          >
            {creating ? 'Creating...' : 'Create Page'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Generate page content based on template
 */
function generatePageContent(pageName: string, templateId: string, parameters: RouteParameter[]): string {
  const imports = "import { useState } from 'minimact';"
  const propsInterface = parameters.length > 0
    ? `\ninterface ${pageName}Props {\n${parameters.map(p => `  ${p.name}${p.optional ? '?' : ''}: string;`).join('\n')}\n}\n`
    : ''
  const propsParam = parameters.length > 0 ? `{ ${parameters.map(p => p.name).join(', ')} }: ${pageName}Props` : ''

  switch (templateId) {
    case 'counter':
      return `${imports}

${propsInterface}export function ${pageName}(${propsParam}) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>${pageName}</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}
`;

    case 'punch':
      return `import { useState, useDomElementState } from 'minimact';

${propsInterface}export function ${pageName}(${propsParam}) {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);

  // DOM-reactive state - tracks the list container
  const listState = useDomElementState();

  const addItem = () => {
    setItems([...items, \`Item \${items.length + 1}\`]);
  };

  const removeItem = () => {
    if (items.length > 0) {
      setItems(items.slice(0, -1));
    }
  };

  return (
    <div>
      <h1>${pageName}</h1>
      <p>Minimact Punch - DOM as a reactive data source</p>

      <div>
        <button onClick={addItem}>Add Item</button>
        <button onClick={removeItem}>Remove Item</button>
      </div>

      {/* DOM State Info */}
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h3>DOM State (Auto-tracked):</h3>
        <p>Children Count: {listState.childrenCount}</p>
        <p>Is Visible: {listState.isIntersecting ? 'Yes' : 'No'}</p>
        <p>Grand Children: {listState.grandChildrenCount}</p>
      </div>

      {/* Reactive rendering based on DOM state */}
      {listState.childrenCount > 5 && (
        <div style={{ color: 'orange', marginTop: '10px' }}>
          ⚠️ List is getting long! ({listState.childrenCount} items)
        </div>
      )}

      {/* Attach the DOM observer to this element */}
      <ul ref={el => listState.attachElement(el)} style={{ marginTop: '20px' }}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <strong>Try this:</strong> Add/remove items and watch the DOM state update automatically!
        The orange warning appears when childrenCount > 5.
      </div>
    </div>
  );
}
`;

    case 'query':
      return `import { useState, useDomQuery } from 'minimact';

${propsInterface}export function ${pageName}(${propsParam}) {
  const [products] = useState([
    { id: 1, name: 'Laptop', category: 'Electronics', price: 999, inStock: true },
    { id: 2, name: 'Mouse', category: 'Electronics', price: 29, inStock: true },
    { id: 3, name: 'Desk', category: 'Furniture', price: 299, inStock: false },
    { id: 4, name: 'Chair', category: 'Furniture', price: 199, inStock: true },
    { id: 5, name: 'Monitor', category: 'Electronics', price: 399, inStock: true },
    { id: 6, name: 'Keyboard', category: 'Electronics', price: 79, inStock: false },
  ]);

  // SQL-like query: Find visible, in-stock items sorted by price
  const visibleProducts = useDomQuery()
    .from('.product-card')
    .where(card => card.isIntersecting && card.attributes['data-in-stock'] === 'true')
    .orderBy(card => Number(card.attributes['data-price']), 'ASC');

  // Aggregate query: Count by category
  const categoryStats = useDomQuery()
    .from('.product-card')
    .groupBy(card => card.attributes['data-category'])
    .select(group => ({
      category: group.key,
      count: group.count,
      avgPrice: group.items.reduce((sum, item) =>
        sum + Number(item.attributes['data-price']), 0) / group.count
    }));

  // Top 3 most expensive
  const topExpensive = useDomQuery()
    .from('.product-card')
    .orderBy(card => Number(card.attributes['data-price']), 'DESC')
    .limit(3);

  return (
    <div>
      <h1>${pageName}</h1>
      <p>Minimact Query - SQL for the DOM 🗃️</p>

      {/* Stats Dashboard */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
          <h3>Visible & In Stock</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{visibleProducts.count()}</p>
        </div>
        <div style={{ padding: '15px', background: '#f3e5f5', borderRadius: '8px' }}>
          <h3>Total Products</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{products.length}</p>
        </div>
      </div>

      {/* Category Stats (GROUP BY) */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Category Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {categoryStats.map(stat => (
            <div key={stat.category} style={{ padding: '10px', background: '#fff3e0', borderRadius: '4px' }}>
              <h4>{stat.category}</h4>
              <p>Count: {stat.count}</p>
              <p>Avg Price: \${stat.avgPrice.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 3 Most Expensive (ORDER BY + LIMIT) */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Top 3 Most Expensive</h2>
        {topExpensive.select(card => ({
          name: card.attributes['data-name'],
          price: card.attributes['data-price']
        })).map((item, i) => (
          <div key={i} style={{ padding: '10px', marginBottom: '5px', background: '#ffebee', borderRadius: '4px' }}>
            #{i + 1}: {item.name} - \${item.price}
          </div>
        ))}
      </div>

      {/* Product Grid */}
      <h2>All Products</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        {products.map(product => (
          <div
            key={product.id}
            className="product-card"
            data-id={product.id}
            data-name={product.name}
            data-category={product.category}
            data-price={product.price}
            data-in-stock={product.inStock}
            style={{
              padding: '15px',
              border: '2px solid',
              borderColor: product.inStock ? '#4caf50' : '#f44336',
              borderRadius: '8px',
              background: 'white'
            }}
          >
            <h3>{product.name}</h3>
            <p style={{ color: '#666' }}>{product.category}</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#2196f3' }}>
              \${product.price}
            </p>
            <p style={{ color: product.inStock ? '#4caf50' : '#f44336' }}>
              {product.inStock ? '✓ In Stock' : '✗ Out of Stock'}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', background: '#f5f5f5', borderRadius: '4px' }}>
        <h3>🎯 What's Happening:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>useDomQuery()</strong> - Queries the DOM like SQL</li>
          <li><strong>.from('.product-card')</strong> - SELECT * FROM .product-card</li>
          <li><strong>.where()</strong> - Filter by visibility and stock status</li>
          <li><strong>.groupBy()</strong> - GROUP BY category</li>
          <li><strong>.orderBy()</strong> - ORDER BY price DESC</li>
          <li><strong>.limit(3)</strong> - LIMIT 3</li>
          <li><strong>Reactive!</strong> - Queries auto-update when DOM changes</li>
        </ul>
      </div>
    </div>
  );
}
`;

    case 'form':
      return `${imports}

${propsInterface}export function ${pageName}(${propsParam}) {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    // TODO: Add your form submission logic
  };

  return (
    <div>
      <h1>${pageName}</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
`;

    case 'list':
      return `${imports}

${propsInterface}export function ${pageName}(${propsParam}) {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);

  const addItem = () => {
    setItems([...items, \`Item \${items.length + 1}\`]);
  };

  return (
    <div>
      <h1>${pageName}</h1>
      <button onClick={addItem}>Add Item</button>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
`;

    case 'crud':
      return `${imports}

interface Item {
  id: number;
  name: string;
}

${propsInterface}export function ${pageName}(${propsParam}) {
  const [items, setItems] = useState<Item[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newItem: Item = { id: Date.now(), name: newName };
    setItems([...items, newItem]);
    setNewName('');
  };

  const handleUpdate = (id: number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, name: editName } : item
    ));
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div>
      <h1>${pageName}</h1>

      {/* Create */}
      <div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New item name"
        />
        <button onClick={handleCreate}>Add</button>
      </div>

      {/* List */}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <button onClick={() => handleUpdate(item.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                {item.name}
                <button onClick={() => { setEditingId(item.id); setEditName(item.name); }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(item.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

    case 'blank':
    default:
      return `${imports}

${propsInterface}export function ${pageName}(${propsParam}) {
  return (
    <div>
      <h1>${pageName}</h1>
      <p>Welcome to your new page!</p>
      ${parameters.length > 0 ? `\n      {/* Route parameters: ${parameters.map(p => p.name).join(', ')} */}` : ''}
    </div>
  );
}
`;
  }
}
