/**
 * Component Processor
 *
 * Main entry point for processing a component function/class.
 */

const t = require('@babel/types');
const { getComponentName } = require('./utils/helpers.cjs');
const { tsTypeToCSharpType } = require('./types/typeConversion.cjs');
const { extractHook } = require('./extractors/hooks.cjs');
const { extractLocalVariables } = require('./extractors/localVariables.cjs');
const { inferPropTypes } = require('./analyzers/propTypeInference.cjs');
const {
  extractTemplates,
  extractAttributeTemplates,
  addTemplateMetadata
} = require('./extractors/templates.cjs');
const { extractLoopTemplates } = require('./extractors/loopTemplates.cjs');
const { extractStructuralTemplates } = require('./extractors/structuralTemplates.cjs');
const { extractExpressionTemplates } = require('./extractors/expressionTemplates.cjs');
const { analyzePluginUsage, validatePluginUsage } = require('./analyzers/analyzePluginUsage.cjs');

/**
 * Process a component function
 */
function processComponent(path, state) {
  const componentName = getComponentName(path);

  if (!componentName) return;
  if (componentName[0] !== componentName[0].toUpperCase()) return; // Not a component

  state.file.minimactComponents = state.file.minimactComponents || [];

  const component = {
    name: componentName,
    props: [],
    useState: [],
    useClientState: [],
    useStateX: [], // Declarative state projections
    useEffect: [],
    useRef: [],
    useMarkdown: [],
    useTemplate: null,
    useValidation: [],
    useModal: [],
    useToggle: [],
    useDropdown: [],
    eventHandlers: [],
    localVariables: [], // Local variables (const/let/var) in function body
    renderBody: null,
    pluginUsages: [], // Plugin instances (<Plugin name="..." state={...} />)
    stateTypes: new Map(), // Track which hook each state came from
    dependencies: new Map(), // Track dependencies per JSX node
    externalImports: new Set(), // Track external library identifiers
    clientComputedVars: new Set() // Track variables using external libs
  };

  // Track external imports at file level
  state.file.path.traverse({
    ImportDeclaration(importPath) {
      const source = importPath.node.source.value;

      // Skip Minimact imports, relative imports, and CSS imports
      if (source.startsWith('minimact') ||
          source.startsWith('.') ||
          source.startsWith('/') ||
          source.endsWith('.css') ||
          source.endsWith('.scss') ||
          source.endsWith('.sass')) {
        return;
      }

      // Track external library identifiers
      importPath.node.specifiers.forEach(spec => {
        if (t.isImportDefaultSpecifier(spec)) {
          // import _ from 'lodash'
          component.externalImports.add(spec.local.name);
        } else if (t.isImportSpecifier(spec)) {
          // import { sortBy } from 'lodash'
          component.externalImports.add(spec.local.name);
        } else if (t.isImportNamespaceSpecifier(spec)) {
          // import * as _ from 'lodash'
          component.externalImports.add(spec.local.name);
        }
      });
    }
  });

  // Extract props from function parameters
  const params = path.node.params;
  if (params.length > 0 && t.isObjectPattern(params[0])) {
    // Destructured props: function Component({ prop1, prop2 })
    // Check if there's a type annotation on the parameter
    const paramTypeAnnotation = params[0].typeAnnotation?.typeAnnotation;

    for (const property of params[0].properties) {
      if (t.isObjectProperty(property) && t.isIdentifier(property.key)) {
        let propType = 'dynamic';

        // Try to extract type from TypeScript annotation
        if (paramTypeAnnotation && t.isTSTypeLiteral(paramTypeAnnotation)) {
          const propName = property.key.name;
          const tsProperty = paramTypeAnnotation.members.find(
            member => t.isTSPropertySignature(member) &&
                     t.isIdentifier(member.key) &&
                     member.key.name === propName
          );
          if (tsProperty && tsProperty.typeAnnotation) {
            propType = tsTypeToCSharpType(tsProperty.typeAnnotation.typeAnnotation);
          }
        }

        component.props.push({
          name: property.key.name,
          type: propType
        });
      }
    }
  } else if (params.length > 0 && t.isIdentifier(params[0])) {
    // Props as single object: function Component(props)
    // Use 'dynamic' to allow property access
    component.props.push({
      name: params[0].name,
      type: 'dynamic'
    });
  }

  // Find function body
  const body = path.node.body.type === 'BlockStatement'
    ? path.node.body
    : t.blockStatement([t.returnStatement(path.node.body)]);

  // Extract hooks and local variables
  path.traverse({
    CallExpression(hookPath) {
      extractHook(hookPath, component);
    },

    VariableDeclaration(varPath) {
      // Only extract local variables at the top level of the function body
      if (varPath.getFunctionParent() === path && varPath.parent.type === 'BlockStatement') {
        extractLocalVariables(varPath, component, t);
      }
    },

    ReturnStatement(returnPath) {
      if (returnPath.getFunctionParent() === path) {
        // Deep clone the AST node to preserve it before we replace JSX with null
        component.renderBody = t.cloneNode(returnPath.node.argument, true);
      }
    }
  });

  // Infer prop types from usage BEFORE replacing JSX with null
  // Pass the entire function body to analyze all usage (including JSX)
  inferPropTypes(component, body);

  // Extract templates from JSX for hot reload (BEFORE replacing JSX with null)
  if (component.renderBody) {
    const textTemplates = extractTemplates(component.renderBody, component);
    const attrTemplates = extractAttributeTemplates(component.renderBody, component);
    const allTemplates = { ...textTemplates, ...attrTemplates };

    // Add template metadata to component
    addTemplateMetadata(component, allTemplates);

    console.log(`[Minimact Templates] Extracted ${Object.keys(allTemplates).length} templates from ${componentName}`);

    // Extract loop templates for predictive rendering (.map() patterns)
    const loopTemplates = extractLoopTemplates(component.renderBody, component);
    component.loopTemplates = loopTemplates;

    if (loopTemplates.length > 0) {
      console.log(`[Minimact Loop Templates] Extracted ${loopTemplates.length} loop templates from ${componentName}:`);
      loopTemplates.forEach(lt => {
        console.log(`  - ${lt.stateKey}.map(${lt.itemVar} => ...)`);
      });
    }

    // Extract structural templates for conditional rendering (Phase 5)
    const structuralTemplates = extractStructuralTemplates(component.renderBody, component);
    component.structuralTemplates = structuralTemplates;

    if (structuralTemplates.length > 0) {
      console.log(`[Minimact Structural Templates] Extracted ${structuralTemplates.length} structural templates from ${componentName}:`);
      structuralTemplates.forEach(st => {
        console.log(`  - ${st.type === 'conditional' ? 'Ternary' : 'Logical AND'}: ${st.conditionBinding}`);
      });
    }

    // Extract expression templates for computed values (Phase 6)
    const expressionTemplates = extractExpressionTemplates(component.renderBody, component);
    component.expressionTemplates = expressionTemplates;

    if (expressionTemplates.length > 0) {
      console.log(`[Minimact Expression Templates] Extracted ${expressionTemplates.length} expression templates from ${componentName}:`);
      expressionTemplates.forEach(et => {
        if (et.method) {
          console.log(`  - ${et.binding}.${et.method}(${et.args.join(', ')})`);
        } else if (et.operator) {
          console.log(`  - ${et.operator}${et.binding}`);
        } else {
          console.log(`  - ${et.bindings.join(', ')}`);
        }
      });
    }

    // Analyze plugin usage (Phase 3: Plugin System)
    const pluginUsages = analyzePluginUsage(path, component);
    component.pluginUsages = pluginUsages;

    if (pluginUsages.length > 0) {
      // Validate plugin usage
      validatePluginUsage(pluginUsages);

      console.log(`[Minimact Plugins] Found ${pluginUsages.length} plugin usage(s) in ${componentName}:`);
      pluginUsages.forEach(plugin => {
        const versionInfo = plugin.version ? ` v${plugin.version}` : '';
        console.log(`  - <Plugin name="${plugin.pluginName}"${versionInfo} state={${plugin.stateBinding.binding}} />`);
      });
    }
  }

  // Now replace JSX to prevent @babel/preset-react from transforming it
  path.traverse({
    ReturnStatement(returnPath) {
      if (returnPath.getFunctionParent() === path) {
        returnPath.node.argument = t.nullLiteral();
      }
    }
  });

  state.file.minimactComponents.push(component);
}

module.exports = {
  processComponent
};
