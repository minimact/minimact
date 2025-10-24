/**
 * JSX Runtime Shim for Visual Compiler
 *
 * Provides deterministic JSX element creation for layout analysis
 * without side effects or dynamic behavior
 */

interface JSXElement {
  type: string | Function;
  props: Record<string, any>;
  key: string | null;
  ref: any;
}

/**
 * Create JSX element with data-component tagging
 */
export function jsx(type: any, props: any, key?: string): JSXElement {
  // Auto-tag components for Visual Compiler
  const enhancedProps = enhancePropsForAnalysis(type, props);

  return {
    type,
    props: enhancedProps,
    key: key || null,
    ref: props?.ref || null
  };
}

/**
 * Create JSX element with children (same as jsx for our purposes)
 */
export function jsxs(type: any, props: any, key?: string): JSXElement {
  return jsx(type, props, key);
}

/**
 * Fragment component (simplified)
 */
export function Fragment(props: { children?: any }): JSXElement {
  return jsx('div', { ...props, 'data-component': 'Fragment' });
}

/**
 * Enhance props with data attributes for Visual Compiler analysis
 */
function enhancePropsForAnalysis(type: any, props: any): Record<string, any> {
  const enhanced = { ...props };

  // Add data-component attribute for analysis
  if (typeof type === 'string') {
    // HTML elements
    if (!enhanced['data-component']) {
      enhanced['data-component'] = type;
    }
  } else if (typeof type === 'function') {
    // React components
    const componentName = type.name || type.displayName || 'Component';
    if (!enhanced['data-component']) {
      enhanced['data-component'] = componentName;
    }
  }

  // Add data-instance if not present
  if (!enhanced['data-instance']) {
    enhanced['data-instance'] = '1';
  }

  // Suppress event handlers to prevent side effects
  Object.keys(enhanced).forEach(key => {
    if (key.startsWith('on') && typeof enhanced[key] === 'function') {
      enhanced[key] = () => {}; // No-op event handler
    }
  });

  return enhanced;
}

// Re-export for compatibility
export { jsx as jsxDEV };
export { jsxs as jsxsDEV };

// Default export for older JSX transforms
export default {
  jsx,
  jsxs,
  Fragment
};