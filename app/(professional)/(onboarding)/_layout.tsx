import React from "react";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      {/* ADD THIS LINE - It was missing! */}
      <Stack.Screen name="step-business-info" /> 
      <Stack.Screen name="step-identity" />
      <Stack.Screen name="step-services" />
      <Stack.Screen name="step-clearance" />
      <Stack.Screen name="step-success" />
    </Stack>
  );
}