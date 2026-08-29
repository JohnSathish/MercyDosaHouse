const path = require('path');

const appRoot = path.resolve(__dirname, '..');
process.chdir(appRoot);
require(require.resolve('@expo/cli/build/bin/cli', { paths: [appRoot] }));
