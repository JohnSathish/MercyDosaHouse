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

/** RN-safe types — avoids loading zod/schemas.ts at startup. */
const workspaceSources = {
  '@mdh/types': path.join(monorepoRoot, 'packages/types/src/native-app.ts'),
  '@mdh/utils': path.join(monorepoRoot, 'packages/utils/src/index.ts'),
  '@mdh/mobile-shared': path.join(monorepoRoot, 'mobile/shared/src/index.ts'),
};

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (workspaceSources[moduleName]) {
    return { type: 'sourceFile', filePath: workspaceSources[moduleName] };
  }
  if (defaultResolve) {
    return defaultResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
