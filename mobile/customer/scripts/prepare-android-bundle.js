const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname.replace(/[\\/]scripts$/, '');
const distDir = path.join(root, 'dist');
const assetsDir = path.join(root, 'android', 'app', 'src', 'main', 'assets');

console.log('Building workspace packages…');
execSync(
  'pnpm --filter @mdh/types build && pnpm --filter @mdh/utils build && pnpm --filter @mdh/mobile-shared build',
  {
    cwd: path.join(root, '../..'),
    stdio: 'inherit',
    shell: true,
  },
);

console.log('Exporting JS bundle…');
execSync('npx expo export --platform android --no-bytecode -c', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
  shell: true,
});

const jsDir = path.join(distDir, '_expo', 'static', 'js', 'android');
const bundles = fs.readdirSync(jsDir).filter((f) => f.startsWith('entry-') && f.endsWith('.js'));
if (!bundles.length) {
  console.error('No bundle found in', jsDir);
  process.exit(1);
}

fs.mkdirSync(assetsDir, { recursive: true });
const srcBundle = path.join(jsDir, bundles[0]);
const destBundle = path.join(assetsDir, 'index.android.bundle');
fs.copyFileSync(srcBundle, destBundle);
console.log('Copied bundle →', destBundle);

console.log('Android bundle ready. Run gradlew assembleRelease in android/');
