# babel-plugin-minimact Examples

Input/output examples demonstrating each module in the plugin (41 CJS files).

## Quick Reference

| Module | Input File | Output File |
|--------|------------|-------------|
| **Analyzers** | | |
| analyzePluginUsage.cjs | analyzePluginUsage.input.tsx | analyzePluginUsage.expected.cs |
| classification.cjs | classification.input.tsx | classification.expected.cs |
| dependencies.cjs | dependencies.input.tsx | dependencies.expected.cs |
| detection.cjs | detection.input.tsx | detection.expected.cs |
| hookAnalyzer.cjs | hookAnalyzer.input.tsx | hookAnalyzer.expected.json |
| hookDetector.cjs | hookDetector.input.tsx | hookDetector.expected.cs |
| hookImports.cjs | hookImports.input.tsx | hookImports.expected.cs |
| propTypeInference.cjs | propTypeInference.input.tsx | propTypeInference.expected.cs |
| razorDetection.cjs | razorDetection.input.tsx | razorDetection.expected.cs |
| timelineAnalyzer.cjs | timelineAnalyzer.input.tsx | timelineAnalyzer.expected.cs |
| **Extractors** | | |
| conditionalElementTemplates.cjs | conditionalElementTemplates.input.tsx | conditionalElementTemplates.expected.json |
| eventHandlers.cjs | eventHandlers.input.tsx | eventHandlers.expected.cs |
| expressionTemplates.cjs | expressionTemplates.input.tsx | expressionTemplates.expected.cs |
| hooks.cjs | hooks.input.tsx | hooks.expected.cs |
| hookSignature.cjs | hookSignature.input.tsx | hookSignature.expected.json |
| localVariables.cjs | localVariables.input.tsx | localVariables.expected.cs |
| loopTemplates.cjs | loopTemplates.input.tsx | loopTemplates.expected.cs |
| props.cjs | props.input.tsx | props.expected.cs |
| structuralTemplates.cjs | structuralTemplates.input.tsx | structuralTemplates.expected.cs |
| templates.cjs | templates.input.tsx | templates.expected.json |
| useStateX.cjs | useStateX.input.tsx | useStateX.expected.cs |
| **Generators** | | |
| component.cjs | component.input.tsx | component.expected.cs |
| csharpFile.cjs | csharpFile.input.tsx | csharpFile.expected.cs |
| expressions.cjs | expressions.input.tsx | expressions.expected.cs |
| hookClassGenerator.cjs | hookClassGenerator.input.tsx | hookClassGenerator.expected.cs |
| jsx.cjs | jsx.input.tsx | jsx.expected.cs |
| plugin.cjs | plugin.input.tsx | plugin.expected.cs |
| razorMarkdown.cjs | razorMarkdown.input.tsx | razorMarkdown.expected.cs |
| renderBody.cjs | renderBody.input.tsx | renderBody.expected.cs |
| runtimeHelpers.cjs | runtimeHelpers.input.tsx | runtimeHelpers.expected.cs |
| rustTask.cjs | rustTask.input.tsx | rustTask.expected.cs |
| serverTask.cjs | serverTask.input.tsx | serverTask.expected.cs |
| timelineGenerator.cjs | timelineGenerator.input.tsx | timelineGenerator.expected.cs |
| **Transpilers** | | |
| typescriptToCSharp.cjs | typescriptToCSharp.input.tsx | typescriptToCSharp.expected.cs |
| typescriptToRust.cjs | typescriptToRust.input.tsx | typescriptToRust.expected.rs |
| **Types** | | |
| typeConversion.cjs | typeConversion.input.tsx | typeConversion.expected.cs |
| **Utils** | | |
| helpers.cjs | helpers.input.tsx | helpers.expected.cs |
| hexPath.cjs | hexPath.input.tsx | hexPath.expected.cs |
| pathAssignment.cjs | pathAssignment.input.tsx | pathAssignment.expected.cs |
| styleConverter.cjs | styleConverter.input.tsx | styleConverter.expected.cs |
| **Core** | | |
| processComponent.cjs | processComponent.input.tsx | processComponent.expected.cs |

## Additional Examples

| Input | Output | Description |
|-------|--------|-------------|
| conditionals.input.tsx | conditionals.expected.cs | General conditional rendering |
| customHook.input.tsx | customHook.expected.cs | Custom hook definition and usage |
| BlogPost.input.tsx | BlogPost.expected.cs | Full component example |

## Usage

Each example pair demonstrates:
1. **Input**: TypeScript/TSX source code
2. **Output**: Generated C# code (or JSON for template/analysis output)

The expected output shows what the babel plugin produces when processing the input file.

## Running Examples

```bash
# Process a single example
npx babel examples/hooks.input.tsx --plugins=./index.cjs

# Compare output with expected
diff <(npx babel examples/hooks.input.tsx --plugins=./index.cjs) examples/hooks.expected.cs
```
