/**
 * Example: typeConversion.cjs - Maps TS types to C# types
 */
import { useState } from '@minimact/core';

// All TypeScript types that get converted
interface AllTypes {
  // Primitives
  str: string;
  num: number;
  bool: boolean;
  bigint: bigint;

  // Special
  anyVal: any;
  unknownVal: unknown;
  neverVal: never;
  voidVal: void;
  nullVal: null;
  undefinedVal: undefined;

  // Arrays
  strArr: string[];
  numArr: number[];
  genericArr: Array<boolean>;

  // Objects
  record: Record<string, number>;
  map: Map<string, boolean>;
  set: Set<number>;

  // Functions
  callback: () => void;
  handler: (x: number) => string;
  asyncFn: () => Promise<string>;

  // Tuples
  tuple: [string, number, boolean];

  // Union/Intersection
  union: string | number;
  nullable: string | null;

  // Generics
  optional?: string;
  readonly readonlyStr: string;
}

export function TypeConversionExample() {
  // Explicit generic types
  const [items, setItems] = useState<string[]>([]);
  const [count, setCount] = useState<number>(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [callback, setCallback] = useState<() => void>(() => {});

  return <div>Type conversion demo</div>;
}
