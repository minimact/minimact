/**
 * Component Generator
 */

const t = require('@babel/types');
const { generateRenderBody } = require('./renderBody.cjs');
const { generateCSharpExpression, generateCSharpStatement } = require('./expressions.cjs');

/**
 * Generate C# class for a component
 */
function generateComponent(component) {
  const lines = [];

  // Class declaration
  lines.push('[Component]');

  const baseClass = component.useTemplate
    ? component.useTemplate.name
    : 'MinimactComponent';

  lines.push(`public partial class ${component.name} : ${baseClass}`);
  lines.push('{');

  // Template properties (from useTemplate)
  if (component.useTemplate && component.useTemplate.props) {
    for (const [propName, propValue] of Object.entries(component.useTemplate.props)) {
      // Capitalize first letter for C# property name
      const csharpPropName = propName.charAt(0).toUpperCase() + propName.slice(1);
      lines.push(`    public override string ${csharpPropName} => "${propValue}";`);
      lines.push('');
    }
  }

  // Prop fields (from function parameters)
  for (const prop of component.props) {
    lines.push(`    [Prop]`);
    lines.push(`    public ${prop.type} ${prop.name} { get; set; }`);
    lines.push('');
  }

  // State fields (useState)
  for (const state of component.useState) {
    lines.push(`    [State]`);
    lines.push(`    private ${state.type} ${state.name} = ${state.initialValue};`);
    lines.push('');
  }

  // Ref fields (useRef)
  for (const ref of component.useRef) {
    lines.push(`    [Ref]`);
    lines.push(`    private object ${ref.name} = ${ref.initialValue};`);
    lines.push('');
  }

  // Markdown fields (useMarkdown)
  for (const md of component.useMarkdown) {
    lines.push(`    [Markdown]`);
    lines.push(`    [State]`);
    lines.push(`    private string ${md.name} = ${md.initialValue};`);
    lines.push('');
  }

  // Validation fields (useValidation)
  for (const validation of component.useValidation) {
    lines.push(`    [Validation]`);
    lines.push(`    private ValidationField ${validation.name} = new ValidationField`);
    lines.push(`    {`);
    lines.push(`        FieldKey = "${validation.fieldKey}",`);

    // Add validation rules
    if (validation.rules.required) {
      lines.push(`        Required = ${validation.rules.required.toString().toLowerCase()},`);
    }
    if (validation.rules.minLength) {
      lines.push(`        MinLength = ${validation.rules.minLength},`);
    }
    if (validation.rules.maxLength) {
      lines.push(`        MaxLength = ${validation.rules.maxLength},`);
    }
    if (validation.rules.pattern) {
      lines.push(`        Pattern = @"${validation.rules.pattern}",`);
    }
    if (validation.rules.message) {
      lines.push(`        Message = "${validation.rules.message}"`);
    }

    lines.push(`    };`);
    lines.push('');
  }

  // Modal fields (useModal)
  for (const modal of component.useModal) {
    lines.push(`    private ModalState ${modal.name} = new ModalState();`);
    lines.push('');
  }

  // Toggle fields (useToggle)
  for (const toggle of component.useToggle) {
    lines.push(`    [State]`);
    lines.push(`    private bool ${toggle.name} = ${toggle.initialValue};`);
    lines.push('');
  }

  // Dropdown fields (useDropdown)
  for (const dropdown of component.useDropdown) {
    lines.push(`    private DropdownState ${dropdown.name} = new DropdownState();`);
    lines.push('');
  }

  // Render method (or RenderContent for templates)
  const renderMethodName = component.useTemplate ? 'RenderContent' : 'Render';
  lines.push(`    protected override VNode ${renderMethodName}()`);
  lines.push('    {');

  // Only add StateManager sync if NOT using a template (templates handle this themselves)
  if (!component.useTemplate) {
    lines.push('        StateManager.SyncMembersToState(this);');
    lines.push('');
  }

  // Local variables
  for (const localVar of component.localVariables) {
    lines.push(`        ${localVar.type} ${localVar.name} = ${localVar.initialValue};`);
  }
  if (component.localVariables.length > 0) {
    lines.push('');
  }

  if (component.renderBody) {
    const renderCode = generateRenderBody(component.renderBody, component, 2);
    lines.push(renderCode);
  } else {
    lines.push('        return new VText("");');
  }

  lines.push('    }');

  // Effect methods (useEffect)
  let effectIndex = 0;
  for (const effect of component.useEffect) {
    lines.push('');

    // Extract dependency names from array
    const deps = [];
    if (effect.dependencies && t.isArrayExpression(effect.dependencies)) {
      for (const dep of effect.dependencies.elements) {
        if (t.isIdentifier(dep)) {
          deps.push(dep.name);
        }
      }
    }

    // Generate [OnStateChanged] for each dependency
    for (const dep of deps) {
      lines.push(`    [OnStateChanged("${dep}")]`);
    }

    lines.push(`    private void Effect_${effectIndex}()`);
    lines.push('    {');

    // Extract and convert effect body
    if (effect.body && t.isArrowFunctionExpression(effect.body)) {
      const body = effect.body.body;
      if (t.isBlockStatement(body)) {
        // Multi-statement effect
        for (const stmt of body.body) {
          lines.push(`        ${generateCSharpStatement(stmt)}`);
        }
      } else {
        // Single expression effect
        lines.push(`        ${generateCSharpExpression(body)};`);
      }
    }

    lines.push('    }');
    effectIndex++;
  }

  // Event handlers
  for (const handler of component.eventHandlers) {
    lines.push('');
    lines.push(`    private void ${handler.name}()`);
    lines.push('    {');
    lines.push(`        // TODO: Implement ${handler.name}`);
    lines.push('    }');
  }

  // Toggle methods (useToggle)
  for (const toggle of component.useToggle) {
    lines.push('');
    lines.push(`    private void ${toggle.toggleFunc}()`);
    lines.push('    {');
    lines.push(`        ${toggle.name} = !${toggle.name};`);
    lines.push(`        SetState("${toggle.name}", ${toggle.name});`);
    lines.push('    }');
  }

  lines.push('}');

  return lines;
}

module.exports = {
  generateComponent
};
