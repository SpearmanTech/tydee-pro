import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config, // This spreads existing static config if you have an app.json
  name: "Foona",
  slug: "Foona",
  scheme: "Foona",
  version: "1.0.0",

  // EAS EXPECTS THESE EXACTLY LIKE THIS:
  updates: {
    url: "https://u.expo.dev/cff17f73-4614-49ef-b229-bb58401bcc55",
  },
  runtimeVersion: {
    policy: "appVersion",
  },

  platforms: ["ios", "android", "web"],
  ios: {
    bundleIdentifier: "com.spearman.Foona",
    supportsTablet: true,
  },
  android: {
    package: "com.spearman.Foona",
  },
  plugins: [
    "expo-router",
    "@react-native-community/datetimepicker",
    "expo-web-browser",
  ],
  extra: {
    eas: {
      projectId: "cff17f73-4614-49ef-b229-bb58401bcc55",
    },
  },
});
