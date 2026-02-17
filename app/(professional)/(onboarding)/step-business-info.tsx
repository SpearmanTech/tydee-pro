import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft } from 'lucide-react-native'; 

export default function StepBusinessInfo() {
  const { user, signOut } = useAuth(); // Added signOut here
  const [name, setName] = useState("");
  const [years, setYears] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleBack = () => {
    Alert.alert(
      "Exit Onboarding?",
      "You will be signed out. you can continue your setup later.",
      [
        { text: "Stay", style: "cancel" },
        { 
          text: "Exit", 
          style: "destructive", 
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/login");
          } 
        }
      ]
    );
  };

 // Inside StepBusinessInfo.tsx
const handleNext = async () => {
  if (!name.trim() || !years.trim()) {
    return Alert.alert("Missing Info", "Please enter all details.");
  }
  
  setLoading(true);
  
  // A helper to try saving multiple times if it's a permission issue
  const saveWithRetry = async (retries = 3) => {
    try {
      const profRef = doc(db, "professionals", user!.uid);
      await setDoc(profRef, {
        professionalName: name.trim(),
        experienceYears: Number(years),
        onboardingStep: 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      router.push("/(professional)/(onboarding)/step-services");
    } catch (e: any) {
      if (retries > 0 && e.code === 'permission-denied') {
        console.log(`Retrying save... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s
        return saveWithRetry(retries - 1);
      }
      throw e;
    }
  };

  try {
    await saveWithRetry();
  } catch (e: any) {
    console.error("Step 1 Final Failure:", e);
    Alert.alert("Permission Syncing", "Your account is still being verified by the system. Please wait 5 seconds and try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      {/* 1. BACK ARROW */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <ArrowLeft size={24} color="#111827" />
      </TouchableOpacity>

      <View style={styles.inner}>
        <Text style={styles.step}>Step 1 of 4</Text>
        <Text style={styles.title}>Tell us about your business</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>BUSINESS NAME</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Durban Cleaning Pros"
            value={name}
            onChangeText={setName}
            keyboardType="default"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>YEARS OF EXPERIENCE</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 5"
            keyboardType="number-pad"
            value={years}
            onChangeText={setYears}
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, (!name || !years) && styles.buttonDisabled]} 
          onPress={handleNext} 
          disabled={loading || !name || !years}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Next: Services</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backButton: {
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginLeft: 25,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  inner: { flex: 1, padding: 30, paddingTop: 20 },
  step: { color: '#6366f1', fontWeight: '800', marginBottom: 10, fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 40 },
  inputGroup: { marginBottom: 30 },
  label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  input: { 
    fontSize: 18, 
    borderBottomWidth: 2, 
    borderBottomColor: '#f1f5f9', 
    paddingVertical: 12, 
    paddingHorizontal: 4,
    color: '#1e293b',
    fontWeight: '600'
  },
  button: { 
    backgroundColor: '#111827', 
    padding: 22, 
    borderRadius: 18, 
    alignItems: 'center',
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  buttonDisabled: { backgroundColor: '#e2e8f0' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});