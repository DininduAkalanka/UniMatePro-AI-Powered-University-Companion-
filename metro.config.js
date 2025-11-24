const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for tslib ES module compatibility with web
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'mjs', 'js'],
  resolveRequest: (context, moduleName, platform) => {
    // On web, replace moti with our compatibility wrapper
    if (platform === 'web' && moduleName === 'moti') {
      return {
        filePath: path.resolve(__dirname, 'moti-web-compat.js'),
        type: 'sourceFile',
      };
    }
    // Let Metro handle other modules
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
