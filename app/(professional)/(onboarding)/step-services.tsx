import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, MapPin, Briefcase } from 'lucide-react-native';

const AVAILABLE_SERVICES = ["Cleaning", "Plumbing", "Electrical", "Gardening", "Painting", "Handyman"];

export default function StepServices() {
  const { user } = useAuth();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleNext = async () => {
    if (selectedServices.length === 0 || !location.trim()) {
      return Alert.alert("Required", "Please select at least one service and enter your area.");
    }
    
    setLoading(true);
    try {
      await updateDoc(doc(db, "professionals", user!.uid), {
        services: selectedServices,
        location: location.trim(),
      });
      // Moving to Step 3: Identity/Verification
      router.push("/(professional)/(onboarding)/step-identity");
    } catch (e) {
      Alert.alert("Error", "Could not save services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* BACK BUTTON */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        disabled={loading}
      >
        <ArrowLeft size={24} color="#1e293b" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.step}>STEP 2 OF 4</Text>
        <Text style={styles.title}>Your Services{"\n"}& Area</Text>

        <View style={styles.sectionHeader}>
          <Briefcase size={16} color="#6366f1" />
          <Text style={styles.label}>WHICH SERVICES DO YOU OFFER?</Text>
        </View>
        
        <View style={styles.servicesGrid}>
          {AVAILABLE_SERVICES.map((service) => {
            const isSelected = selectedServices.includes(service);
            return (
              <TouchableOpacity 
                key={service} 
                activeOpacity={0.7}
                style={[styles.serviceTag, isSelected && styles.activeTag]}
                onPress={() => toggleService(service)}
              >
                <Text style={[styles.tagText, isSelected && styles.activeTagText]}>
                  {service}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <MapPin size={16} color="#6366f1" />
          <Text style={styles.label}>SERVICE AREA (CITY/SUBURB)</Text>
        </View>
        
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Durban North, Umhlanga"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor="#94a3b8"
          autoCorrect={false}
        />

        <TouchableOpacity 
          style={[styles.mainButton, (selectedServices.length === 0 || !location) && styles.disabledBtn]} 
          onPress={handleNext} 
          disabled={loading || selectedServices.length === 0 || !location}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Next: Verification</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  inner: { paddingHorizontal: 30, paddingBottom: 60, paddingTop: 20 },
  step: { color: '#6366f1', fontWeight: '800', marginBottom: 10, fontSize: 12, letterSpacing: 1.5 },
  title: { fontSize: 34, fontWeight: '900', color: '#1e293b', lineHeight: 40, marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
  serviceTag: { 
    paddingHorizontal: 22, 
    paddingVertical: 14, 
    borderRadius: 18, 
    borderWidth: 1.5, 
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc' 
  },
  activeTag: { 
    backgroundColor: '#6366f1', 
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  tagText: { fontWeight: '700', color: '#64748b', fontSize: 14 },
  activeTagText: { color: '#fff' },
  input: { 
    fontSize: 18, 
    borderBottomWidth: 2, 
    borderBottomColor: '#f1f5f9', 
    paddingVertical: 15, 
    marginBottom: 50,
    color: '#1e293b',
    fontWeight: '600'
  },
  mainButton: { 
    backgroundColor: '#111827', 
    padding: 22, 
    borderRadius: 20, 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  disabledBtn: { backgroundColor: '#e2e8f0' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});