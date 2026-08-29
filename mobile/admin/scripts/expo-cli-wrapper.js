const path = require('path');

const appRoot = path.resolve(__dirname, '..');
process.chdir(appRoot);
const entryFileFlag = process.argv.indexOf('--entry-file');
if (entryFileFlag >= 0 && process.argv[entryFileFlag + 1]) {
  process.argv[entryFileFlag + 1] = path.join(appRoot, 'index.js');
} else {
  process.argv.push('--entry-file', path.join(appRoot, 'index.js'));
}
require(require.resolve('@expo/cli/build/bin/cli', { paths: [appRoot] }));
