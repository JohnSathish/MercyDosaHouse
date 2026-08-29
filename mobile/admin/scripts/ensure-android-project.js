const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const settingsFile = path.join(projectRoot, 'android', 'settings.gradle');

if (!fs.existsSync(settingsFile)) {
  console.log('Android project not found; generating it once with Expo prebuild…');
  execFileSync('npx', ['expo', 'prebuild', '--platform', 'android'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });
} else {
  console.log('Reusing existing Android project and Gradle outputs.');
}
