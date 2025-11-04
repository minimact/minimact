● Perfect! Now I understand the current structure. Let me create a comprehensive modularization plan for Phase 1 (First Pass). The current index.js is 767 lines and does

&nbsp; too much. We need to break it into focused, reusable modules that can leverage logic from the old plugin.



&nbsp; Modularization Plan for minimact-transpiler/babel/src (Phase 1)



&nbsp; Here's my proposed structure:



&nbsp; src/

&nbsp; ├── index.js                      (MAIN ENTRY - orchestration only)

&nbsp; │

&nbsp; ├── core/

&nbsp; │   ├── hexPath.js               (✅ EXISTS - hex path generation)

&nbsp; │   ├── nodes.js                 (✅ EXISTS - JSON node factories)

&nbsp; │   └── traverser.js             (🆕 NEW - JSX tree traversal logic)

&nbsp; │

&nbsp; ├── processors/

&nbsp; │   ├── component.js             (🆕 NEW - component processing)

&nbsp; │   ├── jsx.js                   (🆕 NEW - JSX element processing)

&nbsp; │   ├── attributes.js            (🆕 NEW - attribute processing)

&nbsp; │   ├── expressions.js           (🆕 NEW - expression processing)

&nbsp; │   └── children.js              (🆕 NEW - child node processing)

&nbsp; │

&nbsp; ├── extractors/

&nbsp; │   ├── bindings.js              (🆕 NEW - extract bindings from expressions)

&nbsp; │   ├── templates.js             (🆕 NEW - extract template literals)

&nbsp; │   ├── conditionals.js          (🆕 NEW - extract conditional expressions)

&nbsp; │   ├── loops.js                 (🆕 NEW - extract array.map loops)

&nbsp; │   └── styles.js                (🆕 NEW - extract style objects)

&nbsp; │

&nbsp; ├── utils/

&nbsp; │   ├── ast.js                   (🆕 NEW - AST helper functions)

&nbsp; │   ├── validation.js            (🆕 NEW - validation \& error handling)

&nbsp; │   ├── logging.js               (🆕 NEW - consistent logging)

&nbsp; │   └── fileSystem.js            (🆕 NEW - file I/O operations)

&nbsp; │

&nbsp; └── legacy/

&nbsp;     └── sharedLogic.js           (🆕 NEW - reusable logic from babel-plugin-minimact)



&nbsp; ---

&nbsp; Detailed Breakdown:



&nbsp; 1. core/traverser.js (Central JSX Traversal)



&nbsp; Purpose: Main traversal logic - recursively walks JSX tree and delegates to processors



&nbsp; Exports:

&nbsp; - traverseJSX(node, parentPath, pathGen, t, context) - Main traversal function

&nbsp; - traverseFragment(fragment, parentPath, pathGen, t, context) - Fragment handling

&nbsp; - traverseChildren(children, parentPath, pathGen, t, context) - Child traversal



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/extractors/templates.cjs → traverseJSX() structure (lines 200-400)



&nbsp; ---

&nbsp; 2. processors/component.js (Component Processing)



&nbsp; Purpose: Process component function declarations and find return statements



&nbsp; Exports:

&nbsp; - processComponent(functionNode, outputDir, hexGap, t) - Main entry

&nbsp; - findReturnStatement(body) - Locate return in function body

&nbsp; - extractComponentName(functionNode) - Get component name

&nbsp; - generateComponentJSON(componentName, renderMethod) - Build final JSON



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/processComponent.cjs → Component extraction logic



&nbsp; ---

&nbsp; 3. processors/jsx.js (JSX Element Processing)



&nbsp; Purpose: Process individual JSX elements - tag extraction, structural analysis



&nbsp; Exports:

&nbsp; - processJSXElement(node, parentPath, pathGen, t, context) - Main JSX processor

&nbsp; - getTagName(node, t) - Extract tag name

&nbsp; - isStructuralElement(node, attributes, children) - Check if fully static

&nbsp; - shouldSkipElement(node, t) - Filter logic



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/generators/jsx.cjs → JSX analysis patterns



&nbsp; ---

&nbsp; 4. processors/attributes.js (Attribute Processing)



&nbsp; Purpose: Process all attribute types - static, dynamic, boolean, spread



&nbsp; Exports:

&nbsp; - processAttributes(attributes, parentPath, parentSegments, pathGen, t) - Main entry

&nbsp; - processStaticAttribute(attr, path, segments) - Static strings

&nbsp; - processDynamicAttribute(attr, path, segments, t) - Expressions

&nbsp; - processBooleanAttribute(attr, path, segments) - Boolean flags

&nbsp; - processSpreadAttribute(attr, path, segments, t) - Spread operators



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/extractors/templates.cjs → Attribute extraction (lines 600-800)



&nbsp; ---

&nbsp; 5. processors/expressions.js (Expression Processing)



&nbsp; Purpose: Process JSX expression containers - identify type and extract structure



&nbsp; Exports:

&nbsp; - processExpression(expr, parentPath, pathGen, t) - Main entry

&nbsp; - getExpressionType(expr, t) - Type identification

&nbsp; - getExpressionRaw(expr, t) - Raw string representation

&nbsp; - isSimpleExpression(expr, t) - Check if simple binding

&nbsp; - isComplexExpression(expr, t) - Check if needs C# evaluation



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/extractors/expressionTemplates.cjs → Expression analysis



&nbsp; ---

&nbsp; 6. processors/children.js (Child Node Processing)



&nbsp; Purpose: Process children array - handle mixed content (JSX, text, expressions)



&nbsp; Exports:

&nbsp; - processChildren(children, parentPath, pathGen, t, context) - Main entry

&nbsp; - processTextChild(textNode, parentPath, pathGen, t) - Static text

&nbsp; - processExpressionChild(exprContainer, parentPath, pathGen, t) - Dynamic expressions

&nbsp; - processFragmentChild(fragment, parentPath, pathGen, t, context) - Nested fragments



&nbsp; ---

&nbsp; 7. extractors/bindings.js (Binding Extraction)



&nbsp; Purpose: Extract state/prop bindings from expressions



&nbsp; Exports:

&nbsp; - extractBindings(expr, t) - Main binding extractor

&nbsp; - buildMemberPath(memberExpr, t) - Build dotted path (user.name)

&nbsp; - extractIdentifierBinding(identifier) - Simple identifier

&nbsp; - extractMemberBinding(memberExpr, t) - Member expression

&nbsp; - extractComplexBinding(expr, t) - Complex expressions



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/utils/shared.cjs → buildMemberPathShared() (CRITICAL!)

&nbsp; - babel-plugin-minimact/src/extractors/templates.cjs → Binding extraction patterns



&nbsp; ---

&nbsp; 8. extractors/templates.js (Template Literal Extraction)



&nbsp; Purpose: Extract template literals and convert to slot format



&nbsp; Exports:

&nbsp; - extractTemplateLiteral(node, t) - Main template extractor

&nbsp; - buildTemplateString(quasis, expressionCount) - Build {0}, {1} template

&nbsp; - extractTemplateBindings(expressions, t) - Extract bindings from expressions



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/extractors/templates.cjs → extractTemplateLiteralShared() (lines 450-550)



&nbsp; ---

&nbsp; 9. extractors/conditionals.js (Conditional Extraction)



&nbsp; Purpose: Extract ternary and logical expressions



&nbsp; Exports:

&nbsp; - extractConditionalExpression(expr, parentPath, pathGen, t) - Ternary (? :)

&nbsp; - extractLogicalExpression(expr, parentPath, pathGen, t) - Logical (\&\&, ||)

&nbsp; - extractBinaryExpression(expr, t) - Binary comparisons (>, <, ===)

&nbsp; - extractCondition(testExpr, t) - Condition string



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/extractors/templates.cjs → Conditional traversal logic



&nbsp; ---

&nbsp; 10. extractors/loops.js (Loop Extraction)



&nbsp; Purpose: Extract array.map() loops



&nbsp; Exports:

&nbsp; - extractCallExpression(expr, parentPath, pathGen, t) - Main call handler

&nbsp; - extractMapLoop(callExpr, parentPath, pathGen, t) - Specific to .map()

&nbsp; - extractLoopParameters(arrowFunc, t) - Extract (item, i) params

&nbsp; - extractLoopBody(arrowFunc, parentPath, pathGen, t) - Extract JSX body



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/extractors/loopTemplates.cjs → Loop extraction logic (FULL FILE!)



&nbsp; ---

&nbsp; 11. extractors/styles.js (Style Object Extraction)



&nbsp; Purpose: Extract style={{...}} objects



&nbsp; Exports:

&nbsp; - extractStyleObject(expr, t) - Main style extractor

&nbsp; - extractStyleProperty(prop, t) - Individual property

&nbsp; - extractConditionalValue(expr, t) - Conditional style values

&nbsp; - convertCamelToKebab(camelCase) - CSS property conversion



&nbsp; Reuses from old plugin:

&nbsp; - babel-plugin-minimact/src/utils/styleConverter.cjs → Style conversion logic (FULL FILE!)



&nbsp; ---

&nbsp; 12. utils/ast.js (AST Utilities)



&nbsp; Purpose: Common AST operations and type checks



&nbsp; Exports:

&nbsp; - isJSXElement(node, t) - Type check

&nbsp; - isJSXFragment(node, t) - Type check

&nbsp; - isJSXText(node, t) - Type check

&nbsp; - isJSXExpressionContainer(node, t) - Type check

&nbsp; - getNodeType(node, t) - Get node type string

&nbsp; - walkAST(node, visitor, t) - Generic AST walker



&nbsp; ---

&nbsp; 13. utils/validation.js (Validation \& Errors)



&nbsp; Purpose: Validation logic and error handling



&nbsp; Exports:

&nbsp; - validatePath(path) - Ensure path is valid hex format

&nbsp; - validateBindings(bindings) - Ensure bindings are valid

&nbsp; - validateTemplate(template, bindingCount) - Ensure template slots match bindings

&nbsp; - createError(message, node, context) - Structured error object

&nbsp; - logWarning(message, node, context) - Warning logger



&nbsp; ---

&nbsp; 14. utils/logging.js (Logging Utilities)



&nbsp; Purpose: Consistent, structured logging



&nbsp; Exports:

&nbsp; - logElement(tagName, path) - Log element processing

&nbsp; - logText(text, path) - Log text node

&nbsp; - logExpression(type, raw, path) - Log expression

&nbsp; - logAttribute(name, value, path) - Log attribute

&nbsp; - logStats(component, nodeCount, depth) - Log summary stats

&nbsp; - setLogLevel(level) - Control verbosity



&nbsp; ---

&nbsp; 15. utils/fileSystem.js (File I/O)



&nbsp; Purpose: File system operations



&nbsp; Exports:

&nbsp; - ensureDir(dir) - Create directory if not exists

&nbsp; - writeJSON(filePath, data) - Write formatted JSON

&nbsp; - readJSON(filePath) - Read and parse JSON

&nbsp; - getOutputPath(outputDir, componentName) - Build output file path



&nbsp; ---

&nbsp; 16. legacy/sharedLogic.js (Reusable Old Plugin Logic)



&nbsp; Purpose: Extract and port reusable functions from babel-plugin-minimact



&nbsp; Exports:

&nbsp; - buildMemberPathShared(node, t) - CRITICAL - member expression path builder

&nbsp; - extractTemplateLiteralShared(node, t) - Template literal extractor

&nbsp; - isEventHandler(attrName) - Check if attribute is event handler

&nbsp; - sanitizeIdentifier(name) - Clean identifier names

&nbsp; - getSourceLocation(node) - Get source location for errors



&nbsp; Ports from old plugin:

&nbsp; - babel-plugin-minimact/src/utils/shared.cjs → Core shared utilities

&nbsp; - babel-plugin-minimact/src/utils/helpers.cjs → Helper functions



&nbsp; ---

&nbsp; Refactored index.js (Orchestration Only)



&nbsp; /\*\*

&nbsp;  \* Minimact Transpiler - Babel Plugin

&nbsp;  \* PHASE 1: JSX → JSON AST (Structure + Hex Paths Only)

&nbsp;  \*/



&nbsp; const { HexPathGenerator } = require('./core/hexPath');

&nbsp; const { createComponent, createRenderMethod } = require('./core/nodes');

&nbsp; const { traverseJSX } = require('./core/traverser');

&nbsp; const { processComponent } = require('./processors/component');

&nbsp; const { ensureDir, writeJSON, getOutputPath } = require('./utils/fileSystem');

&nbsp; const { logStats } = require('./utils/logging');



&nbsp; module.exports = function (babel) {

&nbsp;   const { types: t } = babel;



&nbsp;   return {

&nbsp;     name: 'minimact-transpiler-babel',



&nbsp;     visitor: {

&nbsp;       Program(programPath, state) {

&nbsp;         const outputDir = state.opts.outputDir || './Generated';

&nbsp;         const hexGap = state.opts.hexGap || 0x10000000;



&nbsp;         ensureDir(outputDir);



&nbsp;         // Find and process all exported components

&nbsp;         programPath.traverse({

&nbsp;           ExportNamedDeclaration(exportPath) {

&nbsp;             const declaration = exportPath.node.declaration;

&nbsp;             if (t.isFunctionDeclaration(declaration)) {

&nbsp;               processComponent(declaration, outputDir, hexGap, t);

&nbsp;             }

&nbsp;           },



&nbsp;           ExportDefaultDeclaration(exportPath) {

&nbsp;             const declaration = exportPath.node.declaration;

&nbsp;             if (t.isFunctionDeclaration(declaration)) {

&nbsp;               processComponent(declaration, outputDir, hexGap, t);

&nbsp;             }

&nbsp;           }

&nbsp;         });

&nbsp;       }

&nbsp;     }

&nbsp;   };

&nbsp; };



&nbsp; Result: index.js goes from 767 lines → ~50 lines!



&nbsp; ---

&nbsp; Key Benefits of This Structure:



&nbsp; 1. Separation of Concerns: Each file has ONE job

&nbsp; 2. Reusability: Extractors can be used independently

&nbsp; 3. Testability: Each module can be unit tested

&nbsp; 4. Maintainability: Easy to locate and fix bugs

&nbsp; 5. Extensibility: Easy to add new features

&nbsp; 6. Legacy Porting: Clear mapping to old plugin functions



&nbsp; ---

&nbsp; Priority Order for Implementation:



&nbsp; Week 1 - Core Structure:

&nbsp; 1. utils/fileSystem.js - Foundation

&nbsp; 2. utils/logging.js - Debugging

&nbsp; 3. utils/ast.js - Type checks

&nbsp; 4. legacy/sharedLogic.js - Port critical functions

&nbsp; 5. core/traverser.js - Main traversal

&nbsp; 6. processors/component.js - Component handling



&nbsp; Week 1 - Basic Processing:

&nbsp; 7. processors/jsx.js - JSX elements

&nbsp; 8. processors/children.js - Child processing

&nbsp; 9. extractors/bindings.js - Binding extraction

&nbsp; 10. processors/attributes.js - Attributes



&nbsp; Week 2 - Advanced Features:

&nbsp; 11. extractors/templates.js - Template literals

&nbsp; 12. extractors/conditionals.js - Conditionals

&nbsp; 13. extractors/loops.js - Loops

&nbsp; 14. extractors/styles.js - Style objects

&nbsp; 15. processors/expressions.js - Complex expressions



&nbsp; Week 2 - Polish:

&nbsp; 16. utils/validation.js - Error handling

&nbsp; 17. Refactor index.js - Clean orchestration



&nbsp; ---

&nbsp; Would you like me to start implementing this structure? I can:

&nbsp; 1. Start with the foundational utils (fileSystem, logging, ast)

&nbsp; 2. Port the critical buildMemberPathShared from the old plugin

&nbsp; 3. Create the traverser with proper modularization

&nbsp; 4. Implement each processor one by one



&nbsp; Let me know which part you'd like me to tackle first!

