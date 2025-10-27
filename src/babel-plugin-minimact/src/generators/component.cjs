/**
 * Component Generator
 */

const t = require('@babel/types');
const { generateRenderBody } = require('./renderBody.cjs');
const { generateCSharpExpression, generateCSharpStatement, setCurrentComponent } = require('./expressions.cjs');
const { generateServerTaskMethods } = require('./serverTask.cjs');

/**
 * Generate C# class for a component
 */
function generateComponent(component) {
  // Set the current component context for useState setter detection
  setCurrentComponent(component);

  const lines = [];

  // Loop template attributes (for predictive rendering)
  if (component.loopTemplates && component.loopTemplates.length > 0) {
    for (const loopTemplate of component.loopTemplates) {
      const templateJson = JSON.stringify(loopTemplate)
        .replace(/"/g, '""'); // Escape quotes for C# verbatim string

      lines.push(`[LoopTemplate("${loopTemplate.stateKey}", @"${templateJson}")]`);
    }
  }

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

  // Pub/Sub fields (usePub)
  if (component.usePub) {
    for (const pub of component.usePub) {
      const channelStr = pub.channel ? `"${pub.channel}"` : 'null';
      lines.push(`    // usePub: ${pub.name}`);
      lines.push(`    private string ${pub.name}_channel = ${channelStr};`);
      lines.push('');
    }
  }

  // Pub/Sub fields (useSub)
  if (component.useSub) {
    for (const sub of component.useSub) {
      const channelStr = sub.channel ? `"${sub.channel}"` : 'null';
      lines.push(`    // useSub: ${sub.name}`);
      lines.push(`    private string ${sub.name}_channel = ${channelStr};`);
      lines.push(`    private dynamic ${sub.name}_value = null;`);
      lines.push('');
    }
  }

  // Task scheduling fields (useMicroTask)
  if (component.useMicroTask) {
    for (let i = 0; i < component.useMicroTask.length; i++) {
      lines.push(`    // useMicroTask ${i}`);
      lines.push(`    private bool _microTaskScheduled_${i} = false;`);
      lines.push('');
    }
  }

  // Task scheduling fields (useMacroTask)
  if (component.useMacroTask) {
    for (let i = 0; i < component.useMacroTask.length; i++) {
      const task = component.useMacroTask[i];
      lines.push(`    // useMacroTask ${i} (delay: ${task.delay}ms)`);
      lines.push(`    private bool _macroTaskScheduled_${i} = false;`);
      lines.push('');
    }
  }

  // SignalR fields (useSignalR)
  if (component.useSignalR) {
    for (const signalR of component.useSignalR) {
      const hubUrlStr = signalR.hubUrl ? `"${signalR.hubUrl}"` : 'null';
      lines.push(`    // useSignalR: ${signalR.name}`);
      lines.push(`    private string ${signalR.name}_hubUrl = ${hubUrlStr};`);
      lines.push(`    private bool ${signalR.name}_connected = false;`);
      lines.push(`    private string ${signalR.name}_connectionId = null;`);
      lines.push(`    private string ${signalR.name}_error = null;`);
      lines.push('');
    }
  }

  // Predict hint fields (usePredictHint)
  if (component.usePredictHint) {
    for (let i = 0; i < component.usePredictHint.length; i++) {
      const hint = component.usePredictHint[i];
      const hintIdStr = hint.hintId ? `"${hint.hintId}"` : `"hint_${i}"`;
      lines.push(`    // usePredictHint: ${hintIdStr}`);
      lines.push(`    private string _hintId_${i} = ${hintIdStr};`);
      lines.push('');
    }
  }

  // Client-computed properties (from external libraries)
  const clientComputedVars = component.localVariables.filter(v => v.isClientComputed);
  if (clientComputedVars.length > 0) {
    lines.push('    // Client-computed properties (external libraries)');
    for (const clientVar of clientComputedVars) {
      const csharpType = inferCSharpTypeFromInit(clientVar.init);
      lines.push(`    [ClientComputed("${clientVar.name}")]`);
      lines.push(`    private ${csharpType} ${clientVar.name} => GetClientState<${csharpType}>("${clientVar.name}", default);`);
      lines.push('');
    }
  }

  // Server Task methods (useServerTask)
  const serverTaskMethods = generateServerTaskMethods(component);
  for (const line of serverTaskMethods) {
    lines.push(line);
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

  // Local variables (exclude client-computed ones, they're properties now)
  const regularLocalVars = component.localVariables.filter(v => !v.isClientComputed);
  for (const localVar of regularLocalVars) {
    lines.push(`        ${localVar.type} ${localVar.name} = ${localVar.initialValue};`);
  }
  if (regularLocalVars.length > 0) {
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

    // Generate parameter list
    const params = handler.params || [];
    const paramStr = params.length > 0
      ? params.map(p => t.isIdentifier(p) ? `dynamic ${p.name}` : 'dynamic arg').join(', ')
      : '';

    lines.push(`    private void ${handler.name}(${paramStr})`);
    lines.push('    {');

    // Generate method body
    if (handler.body) {
      if (t.isBlockStatement(handler.body)) {
        // Block statement: { ... }
        for (const statement of handler.body.body) {
          const csharpStmt = generateCSharpStatement(statement);
          if (csharpStmt) {
            lines.push(`        ${csharpStmt}`);
          }
        }
      } else {
        // Expression body: () => expression
        const csharpExpr = generateCSharpExpression(handler.body);
        lines.push(`        ${csharpExpr};`);
      }
    }

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

  // Pub/Sub methods (usePub)
  if (component.usePub) {
    for (const pub of component.usePub) {
      lines.push('');
      lines.push(`    // Publish to ${pub.name}_channel`);
      lines.push(`    private void ${pub.name}(dynamic value, PubSubOptions? options = null)`);
      lines.push('    {');
      lines.push(`        EventAggregator.Instance.Publish(${pub.name}_channel, value, options);`);
      lines.push('    }');
    }
  }

  // Pub/Sub methods (useSub)
  if (component.useSub) {
    for (const sub of component.useSub) {
      lines.push('');
      lines.push(`    // Subscribe to ${sub.name}_channel`);
      lines.push(`    protected override void OnInitialized()`);
      lines.push('    {');
      lines.push(`        base.OnInitialized();`);
      lines.push(`        `);
      lines.push(`        // Subscribe to ${sub.name}_channel`);
      lines.push(`        EventAggregator.Instance.Subscribe(${sub.name}_channel, (msg) => {`);
      lines.push(`            ${sub.name}_value = msg.Value;`);
      lines.push(`            SetState("${sub.name}_value", ${sub.name}_value);`);
      lines.push(`        });`);
      lines.push('    }');
    }
  }

  // SignalR methods (useSignalR)
  if (component.useSignalR) {
    for (const signalR of component.useSignalR) {
      lines.push('');
      lines.push(`    // SignalR send method for ${signalR.name}`);
      lines.push(`    // Note: useSignalR is primarily client-side.`);
      lines.push(`    // Server-side SignalR invocation can use HubContext directly if needed.`);
      lines.push(`    private async Task ${signalR.name}_send(string methodName, params object[] args)`);
      lines.push('    {');
      lines.push(`        if (HubContext != null && ConnectionId != null)`);
      lines.push(`        {`);
      lines.push(`            // Send message to specific client connection`);
      lines.push(`            await HubContext.Clients.Client(ConnectionId).SendAsync(methodName, args);`);
      lines.push(`        }`);
      lines.push('    }');
    }
  }

  lines.push('}');

  return lines;
}

/**
 * Infer C# type from JavaScript AST node (for client-computed variables)
 */
function inferCSharpTypeFromInit(node) {
  if (!node) return 'dynamic';

  // Array types
  if (t.isArrayExpression(node)) {
    return 'List<dynamic>';
  }

  // Call expressions - try to infer from method name
  if (t.isCallExpression(node)) {
    const callee = node.callee;

    if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
      const method = callee.property.name;

      // Common array methods return arrays
      if (['map', 'filter', 'sort', 'sortBy', 'orderBy', 'slice', 'concat'].includes(method)) {
        return 'List<dynamic>';
      }

      // Aggregation methods return numbers
      if (['reduce', 'sum', 'sumBy', 'mean', 'meanBy', 'average', 'count', 'size'].includes(method)) {
        return 'double';
      }

      // Find methods return single item
      if (['find', 'minBy', 'maxBy', 'first', 'last'].includes(method)) {
        return 'dynamic';
      }

      // String methods
      if (['format', 'toString', 'join'].includes(method)) {
        return 'string';
      }
    }

    // Direct function calls (moment(), _.chain(), etc.)
    return 'dynamic';
  }

  // String operations
  if (t.isTemplateLiteral(node) || t.isStringLiteral(node)) {
    return 'string';
  }

  // Numbers
  if (t.isNumericLiteral(node)) {
    return 'double';
  }

  // Booleans
  if (t.isBooleanLiteral(node)) {
    return 'bool';
  }

  // Binary expressions - try to infer from operation
  if (t.isBinaryExpression(node)) {
    if (['+', '-', '*', '/', '%'].includes(node.operator)) {
      return 'double';
    }
    if (['==', '===', '!=', '!==', '<', '>', '<=', '>='].includes(node.operator)) {
      return 'bool';
    }
  }

  // Logical expressions
  if (t.isLogicalExpression(node)) {
    return 'bool';
  }

  // Default to dynamic
  return 'dynamic';
}

module.exports = {
  generateComponent,
  inferCSharpTypeFromInit
};
