import React from "react";
import { Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function ProfessionalLayout() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
    </Stack>
  );
}