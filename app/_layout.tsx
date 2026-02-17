import { useEffect, useRef, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  StatusBar, 
  Easing 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// 1. Keep the native splash visible
SplashScreen.preventAutoHideAsync();

function TydeeLoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

 useEffect(() => {
    // 1. Entrance Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        // Standard easing.out(easing.exp) mathematical equivalent:
        easing: (t) => 1 - Math.pow(2, -10 * t), 
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // 2. Continuous Pulse Loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
          // Standard linear easing (no function needed or use simple t)
          easing: (t) => t, 
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: (t) => t,
        })
      ])
    );
    
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Animated.View 
        style={[
          styles.logoContainer, 
          { 
            opacity: fadeAnim, 
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim }
            ] 
          }
        ]}
      >
        <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.circle}>
          <Text style={styles.tydeeText}>tydee</Text>
        </LinearGradient>
        <View style={styles.proLabelContainer}>
           <Text style={styles.proText}>Pro</Text>
           <View style={styles.eliteBadge}>
              <Text style={styles.eliteText}>ELITE</Text>
           </View>
        </View>
      </Animated.View>
    </View>
  );
}

function RootLayoutNav() {
  const { user, loading, isOnboarded } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // 1. Manage SplashScreen and Ready State
  useEffect(() => {
    if (!loading && !isNavigationReady) {
      setIsNavigationReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  // 2. SINGLE Navigation Guard
  useEffect(() => {
    // Wait until everything is loaded and navigation is mounted
    if (loading || !isNavigationReady) return;

    const inAuthGroup = segments.includes('(auth)');
    const inOnboarding = segments.includes('(onboarding)');
    const isVerifyingEmail = segments.includes('verify-email');

    // --- CASE 1: NOT LOGGED IN ---
    if (!user) {
      if (!inAuthGroup) {
        // Use replace to wipe history so they can't 'back' into the app
        router.replace('/(auth)/login');
      }
      return; 
    }

    // --- CASE 2: EMAIL NOT VERIFIED ---
    if (!user.emailVerified) {
      if (!isVerifyingEmail) {
        router.replace('/(auth)/verify-email');
      }
      return;
    }

    // --- CASE 3: LOGGED IN & VERIFIED ---
    if (isOnboarded) {
      // If they are in setup/auth screens but already done, move to Dashboard
      if (inAuthGroup || inOnboarding || isVerifyingEmail) {
        router.replace('/(professional)');
      }
    } else {
      // If NOT onboarded and not currently in the onboarding flow, send them there
      if (!inOnboarding && !inAuthGroup && !isVerifyingEmail) {
        router.replace('/(professional)/(onboarding)/index');
      }
    }
  }, [user, user?.emailVerified, loading, isOnboarded, segments, isNavigationReady]);

  if (loading) {
    return <TydeeLoadingScreen />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tydeeText: { color: '#ffffff', fontSize: 28, fontWeight: '800', letterSpacing: -1.5 },
  proLabelContainer: { marginLeft: -15, zIndex: 2 },
  proText: { fontSize: 42, fontWeight: '900', color: '#1e293b', letterSpacing: -1 },
  eliteBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: -5, marginLeft: 5 },
  eliteText: { fontSize: 10, fontWeight: '800', color: '#6366f1', letterSpacing: 2 },
});