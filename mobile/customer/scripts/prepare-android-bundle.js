const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname.replace(/[\\/]scripts$/, '');
const distDir = path.join(root, 'dist');
const assetsDir = path.join(root, 'android', 'app', 'src', 'main', 'assets');

const productionEnv = {
  ...process.env,
  NODE_ENV: 'production',
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://mercydosahouse.com/api/v1',
  EXPO_PUBLIC_WEBSITE_URL: process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://mercydosahouse.com',
};

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

console.log('Building workspace packages…');
execSync(
  'pnpm --filter @mdh/types build && pnpm --filter @mdh/utils build && pnpm --filter @mdh/mobile-shared build',
  {
    cwd: path.join(root, '../..'),
    stdio: 'inherit',
    shell: true,
    env: productionEnv,
  },
);

console.log('Exporting JS bundle for Android release…');
execSync('npx expo export --platform android --no-bytecode -c', {
  cwd: root,
  stdio: 'inherit',
  env: productionEnv,
  shell: true,
});

const jsDir = path.join(distDir, '_expo', 'static', 'js', 'android');
const bundles = fs.readdirSync(jsDir).filter((f) => f.startsWith('entry-') && f.endsWith('.js'));
if (!bundles.length) {
  console.error('No bundle found in', jsDir);
  process.exit(1);
}

if (!fs.existsSync(path.join(root, 'android'))) {
  console.error('android/ folder missing. Run: pnpm prebuild:android');
  process.exit(1);
}

fs.mkdirSync(assetsDir, { recursive: true });
const srcBundle = path.join(jsDir, bundles[0]);
const destBundle = path.join(assetsDir, 'index.android.bundle');
fs.copyFileSync(srcBundle, destBundle);
console.log('Copied bundle →', destBundle);

const exportedAssets = path.join(distDir, 'assets');
copyDir(exportedAssets, path.join(assetsDir, 'assets'));
console.log('Copied exported assets →', path.join(assetsDir, 'assets'));

const buildGradle = path.join(root, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradle)) {
  let gradle = fs.readFileSync(buildGradle, 'utf8');
  if (!gradle.includes('PREBUNDLED_RELEASE')) {
    gradle += `

// PREBUNDLED_RELEASE
gradle.projectsEvaluated {
    tasks.matching { it.name == "createBundleReleaseJsAndAssets" }.configureEach {
        enabled = false
    }
}
`;
    fs.writeFileSync(buildGradle, gradle);
    console.log('Patched android/app/build.gradle to use pre-exported bundle');
  }
}

console.log('Android bundle ready. Run gradlew assembleRelease in android/');
