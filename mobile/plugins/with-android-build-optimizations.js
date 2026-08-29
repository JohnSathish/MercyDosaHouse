const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const OPTIMIZED_PROPERTIES = {
  'org.gradle.caching': 'true',
  'org.gradle.daemon': 'true',
  'org.gradle.jvmargs': '-Xmx3072m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8',
  'org.gradle.parallel': 'true',
  'org.gradle.vfs.watch': 'true',
  'kotlin.incremental': 'true',
  'kotlin.incremental.useClasspathSnapshot': 'true',
};
const UNSUPPORTED_PROPERTIES = ['org.gradle.configuration-cache'];

/** @type {import('@expo/config-plugins').ConfigPlugin} */
module.exports = function withAndroidBuildOptimizations(config) {
  const configWithGradleProperties = withGradleProperties(config, (configWithProperties) => {
    for (const key of [...Object.keys(OPTIMIZED_PROPERTIES), ...UNSUPPORTED_PROPERTIES]) {
      configWithProperties.modResults = configWithProperties.modResults.filter(
        (entry) => !(entry.type === 'property' && entry.key === key),
      );
    }

    configWithProperties.modResults.push(
      {
        type: 'comment',
        value: 'Mercy Dosa House incremental Android build configuration',
      },
      ...Object.entries(OPTIMIZED_PROPERTIES).map(([key, value]) => ({
        type: 'property',
        key,
        value,
      })),
    );

    return configWithProperties;
  });

  return withAppBuildGradle(configWithGradleProperties, (configWithAppBuildGradle) => {
    configWithAppBuildGradle.modResults.contents =
      configWithAppBuildGradle.modResults.contents.replace(
        /^    entryFile = file\(.*$/m,
        '    entryFile = file("${projectRoot}/index.js")',
      );
    configWithAppBuildGradle.modResults.contents =
      configWithAppBuildGradle.modResults.contents.replace(
        /^    cliFile = .*$/m,
        '    cliFile = file("${projectRoot}/scripts/expo-cli-wrapper.js")',
      );
    if (/^    debuggableVariants = .*$/m.test(configWithAppBuildGradle.modResults.contents)) {
      configWithAppBuildGradle.modResults.contents =
        configWithAppBuildGradle.modResults.contents.replace(
          /^    debuggableVariants = .*$/m,
          '    debuggableVariants = ["debug"]',
        );
    } else {
      configWithAppBuildGradle.modResults.contents =
        configWithAppBuildGradle.modResults.contents.replace(
          '    bundleCommand = "export:embed"',
          '    bundleCommand = "export:embed"\n    debuggableVariants = ["debug"]',
        );
    }
    configWithAppBuildGradle.modResults.contents =
      configWithAppBuildGradle.modResults.contents.replace(
        /def enableProguardInReleaseBuilds = .*$/m,
        "def enableProguardInReleaseBuilds = (findProperty('android.enableProguardInReleaseBuilds') ?: System.getenv('MDH_ENABLE_R8') ?: false).toBoolean()",
      );
    configWithAppBuildGradle.modResults.contents =
      configWithAppBuildGradle.modResults.contents.replace(
        /shrinkResources \(findProperty\('android\.enableShrinkResourcesInReleaseBuilds'\)\?\.toBoolean\(\) \?: false\)/,
        "shrinkResources ((findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: System.getenv('MDH_ENABLE_RESOURCE_SHRINK') ?: false).toBoolean())",
      );
    return configWithAppBuildGradle;
  });
};
