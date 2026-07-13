const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Block local backend functions folder
const localFunctionsPath = path.resolve(__dirname, 'functions');
config.resolver.blockList = [
  new RegExp(`^${localFunctionsPath.replace(/\\/g, '\\\\')}\/.*$`)
];

// 2. Allow modern module extensions
config.resolver.sourceExts.push('mjs', 'cjs');
config.resolver.unstable_enablePackageExports = true;

// 3. Correct field priority — react-native must come first
//    or native modules will get browser bundles
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main'];

// 4. Alias bare "react-map-gl" → the mapbox CJS dist
//    (covers any import that doesn't use the subpath)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-map-gl': path.resolve(
    __dirname,
    'node_modules/react-map-gl/dist/mapbox-legacy/index.cjs'
  ),
};

module.exports = config;