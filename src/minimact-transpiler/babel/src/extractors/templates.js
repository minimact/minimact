/**
 * Template Literal Extractor for Minimact Transpiler
 *
 * Extracts template literals and converts them to slot-based format for C# generation.
 *
 * Examples:
 * - `Count: ${count}` → { template: "Count: {0}", bindings: ["count"], slots: [7] }
 * - `${user.name} (${user.age})` → { template: "{0} ({1})", bindings: ["user.name", "user.age"], slots: [0, 3] }
 * - `Price: $${price.toFixed(2)}` → { template: "Price: ${0}", bindings: ["price"], transforms: [{ slotIndex: 0, method: "toFixed", args: [2] }] }
 *
 * Reuses from old plugin:
 * - babel-plugin-minimact/src/extractors/templates.cjs → extractTemplateLiteralShared() (lines 223-271)
 */

const { extractBindings } = require('./bindings');

/**
 * Main template literal extractor
 *
 * Converts ES6 template literal to parameterized template with bindings.
 * Handles both static text (quasis) and dynamic expressions.
 *
 * Pattern from babel-plugin-minimact/src/extractors/templates.cjs (lines 223-271)
 *
 * @param {Object} node - Babel TemplateLiteral node
 * @param {Object} t - Babel types
 * @returns {Object} - Template info with template string, bindings, slots, transforms
 */
function extractTemplateLiteral(node, t) {
  let templateStr = '';
  const bindings = [];
  const slots = [];
  const transforms = [];
  const conditionals = [];

  // Iterate through quasis (static parts) and expressions (dynamic parts)
  for (let i = 0; i < node.quasis.length; i++) {
    const quasi = node.quasis[i];
    templateStr += quasi.value.raw;

    // Check if there's a corresponding expression
    if (i < node.expressions.length) {
      const expr = node.expressions[i];

      // Record slot position (where {i} placeholder starts)
      slots.push(templateStr.length);

      // Add placeholder
      templateStr += `{${i}}`;

      // Extract binding from expression
      const binding = extractBindings(expr, t);

      if (binding && typeof binding === 'object' && binding.type === 'transform') {
        // Transform binding (e.g., price.toFixed(2))
        bindings.push(binding.binding);
        transforms.push({
          slotIndex: i,
          method: binding.transform,
          args: binding.args
        });
      } else if (binding && typeof binding === 'object' && binding.type === 'conditional') {
        // Conditional binding (e.g., count > 5 ? 'High' : 'Low')
        bindings.push(binding.conditional);
        conditionals.push({
          slotIndex: i,
          condition: binding.conditional,
          trueValue: binding.trueValue,
          falseValue: binding.falseValue
        });
      } else if (binding) {
        // Simple binding (string)
        bindings.push(binding);
      } else {
        // Complex binding we can't analyze
        bindings.push('__complex__');
      }
    }
  }

  // Build result object
  const result = {
    template: templateStr,
    bindings,
    slots
  };

  // Add optional metadata
  if (transforms.length > 0) {
    result.transforms = transforms;
  }
  if (conditionals.length > 0) {
    result.conditionals = conditionals;
  }

  return result;
}

/**
 * Build template string from quasis and expression count
 *
 * Creates a template string with {0}, {1}, {2}... placeholders.
 * This is useful when you know the structure but don't have the full node.
 *
 * @param {Array} quasis - Array of quasi objects (static parts)
 * @param {number} expressionCount - Number of expressions
 * @returns {string} - Template string with placeholders
 *
 * @example
 * // quasis: ['Count: ', ''], expressionCount: 1
 * // returns: "Count: {0}"
 *
 * @example
 * // quasis: ['', ' (', ')'], expressionCount: 2
 * // returns: "{0} ({1})"
 */
function buildTemplateString(quasis, expressionCount) {
  let templateStr = '';

  for (let i = 0; i < quasis.length; i++) {
    // Add static text
    templateStr += quasis[i].value.raw;

    // Add placeholder if there's a corresponding expression
    if (i < expressionCount) {
      templateStr += `{${i}}`;
    }
  }

  return templateStr;
}

/**
 * Extract bindings from template literal expressions
 *
 * Processes all expressions in a template literal and returns their bindings.
 * This is useful when you need bindings separately from the template string.
 *
 * @param {Array} expressions - Array of Babel expression nodes
 * @param {Object} t - Babel types
 * @returns {Array} - Array of binding info objects
 *
 * @example
 * // expressions: [Identifier(count), MemberExpression(user.name)]
 * // returns: [
 * //   { index: 0, binding: "count", type: "simple" },
 * //   { index: 1, binding: "user.name", type: "simple" }
 * // ]
 */
function extractTemplateBindings(expressions, t) {
  const result = [];

  for (let i = 0; i < expressions.length; i++) {
    const expr = expressions[i];
    const binding = extractBindings(expr, t);

    if (binding && typeof binding === 'object' && binding.type === 'transform') {
      // Transform binding
      result.push({
        index: i,
        binding: binding.binding,
        type: 'transform',
        transform: binding.transform,
        args: binding.args
      });
    } else if (binding && typeof binding === 'object' && binding.type === 'conditional') {
      // Conditional binding
      result.push({
        index: i,
        binding: binding.conditional,
        type: 'conditional',
        condition: binding.conditional,
        trueValue: binding.trueValue,
        falseValue: binding.falseValue
      });
    } else if (binding) {
      // Simple binding
      result.push({
        index: i,
        binding: binding,
        type: 'simple'
      });
    } else {
      // Complex binding
      result.push({
        index: i,
        binding: '__complex__',
        type: 'complex'
      });
    }
  }

  return result;
}

/**
 * Check if template literal is simple (no transforms, no conditionals)
 *
 * Simple templates can be optimized in C# code generation.
 *
 * @param {Object} templateInfo - Template info object from extractTemplateLiteral
 * @returns {boolean} - True if simple
 */
function isSimpleTemplate(templateInfo) {
  return !templateInfo.transforms && !templateInfo.conditionals;
}

/**
 * Get binding count from template info
 *
 * @param {Object} templateInfo - Template info object
 * @returns {number} - Number of bindings
 */
function getBindingCount(templateInfo) {
  return templateInfo.bindings.length;
}

/**
 * Check if template has only static text (no expressions)
 *
 * @param {Object} node - Babel TemplateLiteral node
 * @returns {boolean} - True if no expressions
 */
function isStaticTemplate(node) {
  return node.expressions.length === 0;
}

/**
 * Extract static text from template literal (if no expressions)
 *
 * @param {Object} node - Babel TemplateLiteral node
 * @returns {string|null} - Static text or null if has expressions
 */
function extractStaticText(node) {
  if (node.expressions.length > 0) {
    return null;
  }

  return node.quasis.map(q => q.value.raw).join('');
}

/**
 * Validate template info
 *
 * Ensures template structure is valid and complete.
 *
 * @param {Object} templateInfo - Template info object
 * @returns {boolean} - True if valid
 */
function validateTemplate(templateInfo) {
  if (!templateInfo || !templateInfo.template) {
    return false;
  }

  // Check that binding count matches slot count
  if (templateInfo.bindings.length !== templateInfo.slots.length) {
    console.warn('[Template Extractor] Binding count mismatch:', {
      bindings: templateInfo.bindings.length,
      slots: templateInfo.slots.length
    });
    return false;
  }

  // Check that placeholders exist in template
  const placeholderCount = (templateInfo.template.match(/\{\d+\}/g) || []).length;
  if (placeholderCount !== templateInfo.bindings.length) {
    console.warn('[Template Extractor] Placeholder count mismatch:', {
      placeholders: placeholderCount,
      bindings: templateInfo.bindings.length
    });
    return false;
  }

  return true;
}

/**
 * Merge multiple template infos (for mixed content)
 *
 * Combines multiple templates into one, adjusting slot indices.
 * Useful for processing mixed JSX text content.
 *
 * @param {Array} templates - Array of template info objects
 * @returns {Object} - Merged template info
 *
 * @example
 * // templates: [
 * //   { template: "Count: {0}", bindings: ["count"], slots: [7] },
 * //   { template: " Items: {0}", bindings: ["items"], slots: [8] }
 * // ]
 * // returns: { template: "Count: {0} Items: {1}", bindings: ["count", "items"], slots: [7, 23] }
 */
function mergeTemplates(templates) {
  let mergedTemplate = '';
  const mergedBindings = [];
  const mergedSlots = [];
  const mergedTransforms = [];
  const mergedConditionals = [];

  let currentSlotIndex = 0;

  for (const template of templates) {
    // Adjust slot indices in template string
    let adjustedTemplate = template.template;
    for (let i = 0; i < template.bindings.length; i++) {
      const oldPlaceholder = `{${i}}`;
      const newPlaceholder = `{${currentSlotIndex + i}}`;
      adjustedTemplate = adjustedTemplate.replace(oldPlaceholder, newPlaceholder);
    }

    mergedTemplate += adjustedTemplate;

    // Merge bindings
    mergedBindings.push(...template.bindings);

    // Adjust and merge slots
    const baseOffset = mergedTemplate.length - adjustedTemplate.length;
    mergedSlots.push(...template.slots.map(s => s + baseOffset));

    // Merge transforms with adjusted slot indices
    if (template.transforms) {
      mergedTransforms.push(...template.transforms.map(t => ({
        ...t,
        slotIndex: t.slotIndex + currentSlotIndex
      })));
    }

    // Merge conditionals with adjusted slot indices
    if (template.conditionals) {
      mergedConditionals.push(...template.conditionals.map(c => ({
        ...c,
        slotIndex: c.slotIndex + currentSlotIndex
      })));
    }

    currentSlotIndex += template.bindings.length;
  }

  const result = {
    template: mergedTemplate,
    bindings: mergedBindings,
    slots: mergedSlots
  };

  if (mergedTransforms.length > 0) {
    result.transforms = mergedTransforms;
  }
  if (mergedConditionals.length > 0) {
    result.conditionals = mergedConditionals;
  }

  return result;
}

module.exports = {
  extractTemplateLiteral,
  buildTemplateString,
  extractTemplateBindings,
  isSimpleTemplate,
  getBindingCount,
  isStaticTemplate,
  extractStaticText,
  validateTemplate,
  mergeTemplates
};
