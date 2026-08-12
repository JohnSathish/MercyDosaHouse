const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = false;

const singletonPackages = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-native',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-screens',
  '@tanstack/react-query',
  'zustand',
  '@react-native-async-storage/async-storage',
];

function resolveFromApp(moduleName) {
  return require.resolve(moduleName, { paths: [projectRoot] });
}

const workspaceSources = {
  '@mdh/types': path.join(monorepoRoot, 'packages/types/src/native-app.ts'),
  '@mdh/utils': path.join(monorepoRoot, 'packages/utils/src/index.ts'),
};

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (workspaceSources[moduleName]) {
    return { type: 'sourceFile', filePath: workspaceSources[moduleName] };
  }

  if (
    singletonPackages.includes(moduleName) ||
    moduleName.startsWith('react-native/') ||
    moduleName.startsWith('react/')
  ) {
    try {
      return { type: 'sourceFile', filePath: resolveFromApp(moduleName) };
    } catch {
      // fall through
    }
  }

  if (defaultResolve) return defaultResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
