const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add the 'functions' folder to the blockList
config.resolver.blockList = [
  /C:\\Users\\admin\\Downloads\\tydee - Pro\\functions\/.*/,
  // Or more generically:
  /.*\/functions\/.*/
];

module.exports = config;