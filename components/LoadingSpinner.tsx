import { View } from "react-native";
import { ActivityIndicator } from "react-native";
import { useThemeColor } from "./Themed";

export function LoadingSpinner() {
  const backgroundColor = useThemeColor({}, "background");
  
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
