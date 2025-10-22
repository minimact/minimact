/**
 * C# File Generator
 */

const { generateComponent } = require('./component.cjs');

/**
 * Generate C# file from components
 */
function generateCSharpFile(components, state) {
  const lines = [];

  // Usings
  lines.push('using Minimact.Runtime.Core;');
  lines.push('using Minimact.Runtime.Extensions;');
  lines.push('using MinimactHelpers = Minimact.Runtime.Core.Minimact;');
  lines.push('using System.Collections.Generic;');
  lines.push('using System.Linq;');
  lines.push('using System.Threading.Tasks;');
  lines.push('');

  // Namespace (extract from file path or use default)
  const namespace = state.opts.namespace || 'Minimact.Components';
  lines.push(`namespace ${namespace};`);
  lines.push('');

  // Generate each component
  for (const component of components) {
    lines.push(...generateComponent(component));
    lines.push('');
  }

  return lines.join('\n');
}


module.exports = {
  generateCSharpFile
};
