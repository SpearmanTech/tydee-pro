import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { user, loading, isOnboarded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProfessionalGroup = segments[0] === '(professional)';

    if (!user && !inAuthGroup) {
      // 1. If no user, force to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // 2. If logged in but still in auth, push to the dashboard
      router.replace('/(professional)/dashboard');
    }
  }, [user, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(professional)" />
    </Stack>
  );
}