import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { user, loading, isOnboarded } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    // 1. Wait until the AuthContext has finished checking Firebase
    if (loading) return;

    // 2. No User? Go to Login.
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    // 3. Logged in? Check Onboarding Status
    if (isOnboarded === false) {
      // FORCE into the onboarding tunnel
      router.replace("/(professional)/(onboarding)");
    } else {
      // Only go here if isOnboarded is explicitly true
      router.replace("/(professional)");
    }
    
  }, [user, loading, isOnboarded]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
});