import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '@/firebase/firebase';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, ShieldAlert } from 'lucide-react-native';

export default function StepClearance() {
  const { user, setIsOnboarded, isOnboarded } = useAuth();  // Add these!
  const [uploading, setUploading] = useState(false);
  const [clearanceUrl, setClearanceUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async () => {
    if (!user) return;

    try {
      // 1. Permissions
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Camera access is required to upload documents.");
        return;
      }

      // 2. Launch Camera
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
      });

      if (result.canceled) return;
      
      setUploading(true);
      const asset = result.assets[0];

      // 3. Convert to Blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // 4. Storage Reference (matching your verification logic)
      const fileRef = ref(storage, `verifications/${user.uid}/clearance.jpg`);

      // 5. Upload
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      // 6. Local State Update
      setClearanceUrl(downloadURL);
      
      // Cleanup blob
      blob.close();
      Alert.alert("Success", "Document uploaded successfully.");

    } catch (e) {
      console.error("UPLOAD ERROR:", e);
      Alert.alert("Error", "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async () => {
  if (!user) return;
  setUploading(true);

  try {
    console.log("🔵 Starting onboarding completion...");
    
    // 1. Update professionals doc
    await updateDoc(doc(db, "professionals", user.uid), {
      "verification.clearance": {
        status: clearanceUrl ? "submitted" : "pending",
        documentUrl: clearanceUrl || null,
        submittedAt: clearanceUrl ? serverTimestamp() : null,
      }
    });
    console.log("✅ Professionals doc updated");

    // 2. Update users doc
    await updateDoc(doc(db, "users", user.uid), { 
      hasCompletedOnboarding: true 
    });
    console.log("✅ Users doc updated");

    // 3. CRITICAL: Set local state FIRST
    setIsOnboarded(true);
    console.log("✅ Local state set to true");

    // 4. Wait longer for Firestore to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Navigate to success (NOT replace - use push)
    console.log("🔵 Navigating to success...");
    router.push("/(professional)/(onboarding)/step-success");

  } catch (e) {
    console.error("❌ Error:", e);
    Alert.alert("Error", "Could not complete onboarding. Please try again.");
    setIsOnboarded(false); // Reset on error
  } finally {
    setUploading(false);
  }
};

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        disabled={uploading}
      >
        <ArrowLeft size={24} color="#1e293b" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.step}>Step 4 of 4</Text>
        <Text style={styles.title}>Safety First</Text>
        
        <View style={styles.warningBox}>
          <ShieldAlert color="#ef4444" size={24} />
          <Text style={styles.warningText}>
            You can browse the marketplace now, but you <Text style={styles.boldText}>cannot accept jobs</Text> until your Police Clearance is approved by our team.
          </Text>
        </View>

        <View style={styles.benefitInfo}>
          <Text style={styles.benefitTitle}>Why get cleared?</Text>
          <Text style={styles.benefitSub}>• Unlock high-value commercial jobs{"\n"}• Build instant trust with homeowners{"\n"}• Featured "Safety First" profile badge</Text>
        </View>

        <Text style={styles.label}>POLICE CLEARANCE CERTIFICATE</Text>
        <TouchableOpacity 
          style={[styles.uploadBox, clearanceUrl && styles.uploaded]} 
          onPress={handleUpload}
          disabled={uploading}
        >
          <View style={styles.uploadContent}>
            {uploading ? (
              <ActivityIndicator color="#6366f1" />
            ) : (
              <>
                <Text style={styles.uploadText}>
                  {clearanceUrl ? "✅ Certificate Attached" : "👮 Upload Clearance (Optional)"}
                </Text>
                {!clearanceUrl && <Text style={styles.uploadSubtext}>PDF, JPG or PNG</Text>}
              </>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.mainButton, uploading && styles.disabledBtn]} 
          onPress={handleFinish} 
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Finish & Enter Dashboard</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleFinish} disabled={uploading}>
          <Text style={styles.skipLink}>Skip for now (I understand the limitations)</Text>
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
  step: { color: '#6366f1', fontWeight: '800', marginBottom: 10, fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '900', color: '#1e293b', marginBottom: 20 },
  warningBox: { 
    backgroundColor: '#fef2f2', 
    padding: 20, 
    borderRadius: 20, 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  warningText: { flex: 1, color: '#b91c1c', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  boldText: { fontWeight: '800' },
  benefitInfo: { marginBottom: 30, paddingLeft: 4 },
  benefitTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  benefitSub: { fontSize: 14, color: '#64748b', lineHeight: 22, fontWeight: '500' },
  label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 12, letterSpacing: 1, marginLeft: 4 },
  uploadBox: { 
    padding: 30, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    borderColor: '#e2e8f0', 
    marginBottom: 35, 
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  uploaded: { borderColor: '#6366f1', backgroundColor: '#f5f3ff', borderStyle: 'solid' },
  uploadContent: { alignItems: 'center' },
  uploadText: { fontWeight: '700', color: '#475569', fontSize: 15 },
  uploadSubtext: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  mainButton: { 
    backgroundColor: '#111827', 
    padding: 22, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  disabledBtn: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skipLink: { textAlign: 'center', marginTop: 30, color: '#94a3b8', fontWeight: '700', textDecorationLine: 'underline' }
});

