const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Explicitly block ONLY your local backend functions folder
// This prevents the generic regex from accidentally blocking node_modules/firebase/functions/
const localFunctionsPath = path.resolve(__dirname, 'functions');
config.resolver.blockList = [
  new RegExp(`^${localFunctionsPath.replace(/\\/g, '\\\\')}\\/.*$`)
];

// 2. Allow modern Firebase module extensions (Crucial for Firebase v9+ on web)
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;