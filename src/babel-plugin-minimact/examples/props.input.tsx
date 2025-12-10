/**
 * Example: props.cjs - Extracts component props
 */

// Destructured props with TypeScript types
interface CardProps {
  title: string;
  count: number;
  isActive: boolean;
  items: string[];
  onClick: () => void;
  config?: { theme: string };
}

export function PropsExample({ title, count, isActive, items, onClick, config }: CardProps) {
  return (
    <div className={isActive ? 'active' : ''}>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <ul>
        {items.map(item => <li>{item}</li>)}
      </ul>
      <button onClick={onClick}>Click me</button>
      {config && <span>Theme: {config.theme}</span>}
    </div>
  );
}

// Props as single object
export function PropsObjectExample(props: { name: string; age: number }) {
  return (
    <div>
      <p>{props.name} is {props.age} years old</p>
    </div>
  );
}
