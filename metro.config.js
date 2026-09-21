const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const threePath = require.resolve('three');

config.resolver.assetExts.push('glb');

// R3F's native entry uses require(), while the scene uses ES imports. Resolve
// both to one Three instance instead of bundling both conditional exports.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: threePath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
