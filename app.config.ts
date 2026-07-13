import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "foona",
  slug: "tydee",
  scheme: "foona",
  version: "1.0.0",

  updates: {
    url: "https://u.expo.dev/cff17f73-4614-49ef-b229-bb58401bcc55",
  },
  runtimeVersion: {
    policy: "appVersion",
  },

  platforms: ["ios", "android", "web"],
  ios: {
    bundleIdentifier: "com.spearman.foona", // Lowercase
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.spearman.foona", // Lowercase
  },
  plugins: [
    "expo-router",
    "expo-build-properties",
    "expo-font",
    "@react-native-community/datetimepicker",
    "expo-web-browser",
    [
      "@didit-protocol/sdk-react-native",
      {
        "iosNfcEnabled": false,
        "androidNfcEnabled": false
      }
    ]
  ],
  extra: {
    eas: {
      projectId: "cff17f73-4614-49ef-b229-bb58401bcc55",
    },
  },
});