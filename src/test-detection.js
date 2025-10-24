/**
 * Quick test to verify external library detection is working
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const plugin = require('./babel-plugin-minimact/index-full.cjs');

const fixtureFile = path.join(__dirname, 'fixtures', 'ExternalLibrariesTest.jsx');
const code = fs.readFileSync(fixtureFile, 'utf-8');

const result = babel.transformSync(code, {
  plugins: [plugin],
  filename: fixtureFile
});

// Access the component metadata
const components = result.metadata?.minimactComponents || [];

if (components.length > 0) {
  const component = components[0];

  console.log('\n✅ Component:', component.name);
  console.log('\n📦 External Imports:', Array.from(component.externalImports || []));
  console.log('\n💻 Client-Computed Variables:', Array.from(component.clientComputedVars || []));

  console.log('\n📝 Local Variables:');
  component.localVariables.forEach(v => {
    console.log(`  - ${v.name} (isClientComputed: ${v.isClientComputed || false})`);
  });
} else {
  console.log('❌ No components found');
}
