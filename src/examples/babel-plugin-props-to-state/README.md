# babel-plugin-props-to-state

Babel plugin that transforms React component props into `useState` hooks, making all components "prop-less" for Visual Compiler analysis.

## Why?

The Visual Compiler Platform needs to discover and render React components for layout analysis. Components with props are problematic because:

1. They can't be rendered without providing prop values
2. Discovery logic filters them out
3. Mock prop systems are complex and brittle

This plugin solves the problem elegantly by converting props to state during transpilation.

## How It Works

### Before (Source Code)
```typescript
interface CardProps {
  title: string;
  count: number;
  onClick: () => void;
}

export const Card = ({ title, count = 0, onClick }: CardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={onClick}>
      <h1>{title}</h1>
      <span>{count}</span>
    </div>
  );
};
```

### After (Transpiled)
```javascript
export const Card = () => {
  // Props converted to useState
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(0);
  const [onClick, setOnClick] = useState(() => () => {});

  // Original useState unchanged
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={onClick}>
      <h1>{title}</h1>
      <span>{count}</span>
    </div>
  );
};
```

## Type Inference

The plugin infers prop types based on:

1. **Default values** (most reliable)
   ```typescript
   { title = 'Default' }  →  useState('Default')
   { count = 0 }          →  useState(0)
   ```

2. **Naming conventions**
   - `onX`, `handleX` → function
   - `isX`, `hasX`, `shouldX`, `canX` → boolean
   - `items`, `list`, `array` → array
   - `count`, `index`, `size` → number
   - Everything else → string

3. **Fallback defaults**
   - `string` → `''`
   - `number` → `0`
   - `boolean` → `false`
   - `array` → `[]`
   - `object` → `{}`
   - `function` → `() => () => {}`

## Features

### ✅ Destructured Props
```typescript
const Component = ({ name, age }: Props) => { ... }
// Transforms both name and age to useState
```

### ✅ Props with Defaults
```typescript
const Component = ({ name = 'John', count = 0 }) => { ... }
// Preserves default values in useState
```

### ✅ Rest Props
```typescript
const Component = ({ name, ...rest }: Props) => { ... }
// rest becomes useState({})
```

### ✅ Arrow Functions
```typescript
const Component = ({ title }) => <div>{title}</div>
// Works with implicit returns
```

### ✅ Auto-Import useState
If `useState` isn't imported, the plugin adds:
```javascript
import { useState } from 'react';
```

## Usage

Add to your Babel configuration:

```javascript
{
  plugins: [
    'babel-plugin-props-to-state'
  ]
}
```

Or in the Visual Compiler's `babel-transpiler.ts`:

```typescript
this.babelOptions = {
  plugins: [
    path.resolve(__dirname, '../babel-plugin-props-to-state/index.cjs')
  ]
};
```

## Integration with Visual Compiler

After transformation:
1. **Discovery** - All components are now prop-less and discoverable
2. **Rendering** - Components render with default prop values
3. **State Editor** - Props appear alongside state, fully editable
4. **Testing** - Users can inject prop values via State Editor

Example discovered states:
```javascript
[
  { key: 'state-0', initialValue: '', currentValue: '' },           // title (was prop)
  { key: 'state-1', initialValue: 0, currentValue: 0 },             // count (was prop)
  { key: 'state-2', initialValue: [Function], currentValue: [Function] }, // onClick (was prop)
  { key: 'state-3', initialValue: false, currentValue: false }      // isExpanded (original state)
]
```

## Limitations

### Non-Destructured Props
```typescript
const Component = (props: Props) => {
  return <div>{props.title}</div>;
}
```

This will remove the `props` parameter but won't inject useState. The component may break unless refactored to use destructuring.

**Solution**: Encourage destructuring in components, or enhance the plugin to parse the Props interface.

### TypeScript Type Annotations Lost
The plugin runs after TypeScript type checking, so type information is not available. Type inference is based on naming conventions and defaults.

**Future Enhancement**: Add a separate TypeScript AST pass to extract type information before Babel transformation.

## Examples

### Example 1: Simple Props
```typescript
// Source
const Button = ({ label, onClick }: ButtonProps) => (
  <button onClick={onClick}>{label}</button>
);

// Transpiled
const Button = () => {
  const [label, setLabel] = useState('');
  const [onClick, setOnClick] = useState(() => () => {});
  return <button onClick={onClick}>{label}</button>;
};
```

### Example 2: Complex Props
```typescript
// Source
const UserCard = ({
  users = [],
  selectedUser,
  onUserSelect,
  isLoading = false
}: UserCardProps) => {
  const [filter, setFilter] = useState('');
  // ...
};

// Transpiled
const UserCard = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(undefined);
  const [onUserSelect, setOnUserSelect] = useState(() => () => {});
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');
  // ...
};
```

## Testing

To verify the plugin works:

1. **Before**: Component with props is not discovered
2. **After**: Component appears in discovery and renders with defaults
3. **State Editor**: Shows all props as editable state

Check the transpiled output in:
```
src/visual-compiler/transpiled-[project]-[session]/components/YourComponent.js
```

## License

MIT
