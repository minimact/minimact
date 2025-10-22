const { readFileSync } = require('fs');
const path = require('path');
const requireResolve = require('require-resolve');

const { defaultOptions } = require('./consts');

/**
 * Visitor for `import '*.css'` babel AST-nodes
 */
function CssImport(cb) {
  return (babelData, { file, opts = {} }) => {
    const { node } = babelData;
    errorBoundary(node.source.value, () => {
      if (!node.source.value.endsWith(opts.ext || '.css')) return;

      const { src } = requireResolve(node.source.value, path.resolve(file.opts.filename));
      const css = readFileSync(src, 'utf8');

      // TODO: load postcss options and plugins
      const options = { ...defaultOptions, ...opts };

      // PATCH: Safely handle side-effect-only imports (no specifiers)
      // When doing: import '@toast-ui/editor/dist/toastui-editor.css';
      // node.specifiers[0] is undefined, so we need to handle this case
      const specifier = node.specifiers && node.specifiers[0];
      const importNode = specifier ? { ...node, ...specifier } : { ...node };

      cb({
        babelData,
        src,
        css,
        importNode,
        options,
      });
    });
  };
}

module.exports = CssImport;

function errorBoundary(cssFile, cb) {
  try {
    cb();
  } catch (e) {
    debugger; // eslint-disable-line no-debugger
    console.error(`babel-plugin-transform-import-css: ${ cssFile }`, e);
    throw e;
  }
}
