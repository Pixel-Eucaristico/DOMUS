const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push("wasm");
config.resolver.assetExts.push("wasm");

config.resolver.blockList = [
  /node_modules\/react-native\/ReactAndroid\/.*/,
  /node_modules\/react-native\/ReactCommon\/.*/,
  /node_modules\/firebase\/[^/]+\/dist\/.*/,
  /node_modules\/@firebase\/[^/]+\/dist\/.*/,
  /node_modules\/react-native-vision-camera\/android\/.*/,
  /node_modules\/react-native-vision-camera\/ios\/.*/,
  /node_modules\/rn-mlkit-ocr\/android\/.*/,
  /node_modules\/rn-mlkit-ocr\/ios\/.*/,
  /node_modules\/@react-native-google-signin\/google-signin\/android\/.*/,
  /node_modules\/@react-native-google-signin\/google-signin\/ios\/.*/,
  /node_modules\/@react-native-firebase\/[^/]+\/android\/.*/,
  /node_modules\/@react-native-firebase\/[^/]+\/ios\/.*/,
  /node_modules\/react-native-google-mobile-ads\/android\/.*/,
  /node_modules\/react-native-google-mobile-ads\/ios\/.*/,
];

module.exports = config;
