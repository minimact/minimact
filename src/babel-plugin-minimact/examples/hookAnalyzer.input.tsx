/**
 * Example: hookAnalyzer.cjs - Analyzes custom hook structure to extract:
 *
 * Output structure (from analyzeHook):
 * {
 *   name: "useAdvancedForm",
 *   className: "UseAdvancedFormHook",
 *   params: [{ name: "initialValues", type: "object" }, ...],
 *   states: [
 *     { varName: "values", setterName: "setValues", type: "object", initialValue: "initialValues" },
 *     { varName: "errors", setterName: "setErrors", type: "object", initialValue: "{}" },
 *     ...
 *   ],
 *   methods: [
 *     { name: "setValue", params: [...], returnType: "void", body: "..." },
 *     { name: "handleSubmit", params: [...], returnType: "void", body: "..." },
 *     ...
 *   ],
 *   jsxElements: [
 *     { type: "variable", varName: "formUI", node: <JSXElement> }
 *   ],
 *   returnValues: [
 *     { index: 0, name: "values", type: "state" },
 *     { index: 1, name: "errors", type: "state" },
 *     { index: 2, name: "isSubmitting", type: "state" },
 *     { index: 3, name: "setValue", type: "method" },
 *     { index: 4, name: "handleSubmit", type: "method" },
 *     { index: 5, name: "reset", type: "method" },
 *     { index: 6, name: "formUI", type: "jsx" }
 *   ]
 * }
 *
 * Functions exported:
 * - analyzeHook(hookPath) → full analysis object
 * - extractStateFromUseState(path) → { varName, setterName, type, initialValue }
 * - extractMethod(declarator) → { name, params, returnType, body }
 * - extractJSXFromReturn(returnArg, analysis, hookPath) → { type, varName?, node }
 * - extractReturnValues(returnArg) → [{ index, name, type }]
 *
 * Return type inference:
 * - Setter: name starts with "set" or matches useState setter
 * - Method: name includes "handle"/"on" or is in methods array
 * - JSX: name is "ui" or ends with "UI"
 * - State: default for other identifiers
 */
import { useState, useEffect, useRef } from '@minimact/core';

// Custom hook to be analyzed
function useAdvancedForm(namespace: string, initialValues: object, validationRules: object) {
  // 1. STATE EXTRACTION: const [x, setX] = useState(initial)
  // → { varName: "values", setterName: "setValues", type: "object", initialValue: "initialValues" }
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref hooks (not currently extracted by hookAnalyzer)
  const formRef = useRef(null);

  // Effect hooks (not currently extracted by hookAnalyzer)
  useEffect(() => {
    validate();
  }, [values]);

  // 2. METHOD EXTRACTION: const name = (params) => { body }
  // → { name: "setValue", params: [{name: "field", type: "string"}, ...], body: "..." }
  const setValue = (field: string, value: any) => {
    setValues({ ...values, [field]: value });
  };

  const setFieldTouched = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  // Function declarations are also extracted
  function validate() {
    const newErrors = {};
    // validation logic
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Async methods → body transpiled to C# async Task
  const handleSubmit = async (onSubmit: Function) => {
    setIsSubmitting(true);
    if (validate()) {
      await onSubmit(values);
    }
    setIsSubmitting(false);
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  // 3. JSX EXTRACTION: const ui = (<JSX>)
  // Patterns detected:
  // - Direct: const ui = <div>...</div>
  // - Conditional: const ui = loading && <div>...</div>
  // - Parenthesized: const ui = (<div>...</div>)
  const formUI = (
    <form ref={formRef}>
      {Object.keys(values).map(field => (
        <div key={field} className={errors[field] ? 'error' : ''}>
          <input
            value={values[field]}
            onChange={(e) => setValue(field, e.target.value)}
            onBlur={() => setFieldTouched(field)}
          />
          {errors[field] && <span className="error-msg">{errors[field]}</span>}
        </div>
      ))}
    </form>
  );

  // 4. RETURN VALUE EXTRACTION
  // Array pattern: return [a, b, c] → [{index:0, name:"a"}, ...]
  // Object pattern: return {a, b, c} → [{index:0, name:"a"}, ...]
  // Type inference:
  //   - "values" → type: "state" (matches state varName)
  //   - "setValues" → type: "setter" (matches state setterName)
  //   - "handleSubmit" → type: "method" (matches method name)
  //   - "formUI" → type: "jsx" (ends with "UI")
  return [values, errors, isSubmitting, setValue, handleSubmit, reset, formUI];
}

// Hook returning object instead of array
function useCounter(namespace: string, initial: number = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);

  // Object return pattern
  return { count, increment, decrement, setCount };
}

// Hook with conditional JSX return
function useModal(namespace: string, title: string) {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  // Conditional JSX pattern: condition && <JSX>
  const ui = isOpen && (
    <div className="modal">
      <h2>{title}</h2>
      <button onClick={close}>Close</button>
    </div>
  );

  return [isOpen, open, close, ui];
}

export function HookAnalyzerExample() {
  const [values, errors, isSubmitting, setValue, handleSubmit, reset, formUI] =
    useAdvancedForm('contact', { name: '', email: '' }, {});

  const { count, increment } = useCounter('myCounter', 0);
  const [isOpen, openModal, closeModal, modalUI] = useModal('confirm', 'Confirm Action');

  return (
    <div>
      <h1>Contact Form</h1>
      {formUI}
      <button onClick={() => handleSubmit(console.log)} disabled={isSubmitting}>
        Submit
      </button>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={openModal}>Open Modal</button>
      {modalUI}
    </div>
  );
}
