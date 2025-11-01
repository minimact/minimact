const fs = require('fs-extra');
const path = require('path');

const source = path.join(__dirname, '../src/client-runtime/dist/core.js');
const dest = path.join(__dirname, '../examples/MyMvcApp/wwwroot/js/minimact.js');

console.log('📦 Syncing Minimact runtime to examples...');
console.log('   Source:', source);
console.log('   Dest:', dest);

try {
  fs.copyFileSync(source, dest);
  const stats = fs.statSync(dest);
  console.log(`✅ Copied minimact.js (${(stats.size / 1024).toFixed(1)}KB) to MyMvcApp`);
} catch (err) {
  console.error('❌ Failed to copy:', err.message);
  process.exit(1);
}
