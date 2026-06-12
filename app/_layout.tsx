import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { loading } = useAuth();

  // Prevents screen flickering while Firebase checks if the user is logged in
  if (loading) {
    return null; 
  }

  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      {/* NO ROUTING LOGIC HERE!
        AuthContext.tsx handles all redirects securely in the background. 
      */}
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(professional)" />
    </Stack>
  );
}