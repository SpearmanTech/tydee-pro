import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { router } from 'expo-router';

export default function OnboardingSuccess() {
  const { user, isOnboarded } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnterApp = () => {
  if (!user || isSubmitting) return;

  setIsSubmitting(true);
  console.log("🎉 Entering dashboard, isOnboarded:", isOnboarded);
  
  // Use a timeout to ensure state has settled
  setTimeout(() => {
    router.replace('/(professional)/index');
    setIsSubmitting(false);
  }, 100);
};
  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn.duration(600)}>
        <CheckCircle2 size={100} color="#10b981" strokeWidth={1.5} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.textCenter}>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Your professional profile has been created. You can explore the dashboard now.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600)} style={styles.footer}>
        <TouchableOpacity 
          style={[styles.btn, isSubmitting && { opacity: 0.7 }]} 
          onPress={handleEnterApp}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Enter Dashboard</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 30 },
  textCenter: { alignItems: 'center', marginTop: 30 },
  title: { fontSize: 32, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  footer: { width: '100%', marginTop: 50 },
  btn: { backgroundColor: '#111827', padding: 22, borderRadius: 20, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 18 }
});