import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import Animated, { FadeInDown, ZoomIn, FadeIn, FadeOut } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/firebase/firebase';
import { useAuth } from '../../../context/AuthContext';
import { Camera, Check, ArrowLeft, ShieldCheck, RefreshCw, CreditCard } from 'lucide-react-native';

export default function StepIdentity() {
  const { setIsOnboarded, signOut } = useAuth();
  const [profileImg, setProfileImg] = useState<string | null>(null);
  const [idImg, setIdImg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleBack = () => {
    Alert.alert("Exit Setup?", "You will be signed out.", [
      { text: "Stay", style: "cancel" },
      { text: "Exit", style: "destructive", onPress: async () => { await signOut(); router.replace("/(auth)/login"); } }
    ]);
  };

  const pickImage = async (type: 'profile' | 'id') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission", "We need access to your photos.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 10],
      quality: 0.7,
    });

    if (!result.canceled) {
      if (type === 'profile') setProfileImg(result.assets[0].uri);
      else setIdImg(result.assets[0].uri);
    }
  };

  const handleFinish = async () => {
    // If skipping or incomplete, we still want to move to the next step, 
    // but the actual upload only happens if images exist.
    if (profileImg && idImg) {
      setUploading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user");

        const profRes = await fetch(profileImg);
        const profBlob = await profRes.blob();
        const profRef = ref(storage, `profileImages/${user.uid}.jpg`);
        await uploadBytes(profRef, profBlob);
        const profUrl = await getDownloadURL(profRef);

        const idRes = await fetch(idImg);
        const idBlob = await idRes.blob();
        const idRef = ref(storage, `verifications/${user.uid}/identity.jpg`);
        await uploadBytes(idRef, idBlob);
        const idUrl = await getDownloadURL(idRef);

        await updateDoc(doc(db, "professionals", user.uid), {
          profileImage: profUrl,
          "verification.identity": {
            status: "submitted",
            documentUrl: idUrl,
            submittedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        });

        profBlob.close();
        idBlob.close();
      } catch (error: any) {
        console.error("UPLOAD ERROR:", error);
        Alert.alert("Error", "Upload failed. You can skip and try again later from settings.");
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    router.push("/step-clearance"); 
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={uploading}>
        <ArrowLeft size={24} color="#111827" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
        <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
          <Text style={styles.stepIndicator}>STEP 3 OF 4</Text>
          <Text style={styles.title}>Identity Verification</Text>
          <Text style={styles.subtitle}>Upload a profile photo and a valid ID to continue.</Text>
        </Animated.View>

        <View style={styles.center}>
          <Text style={styles.label}>PROFESSIONAL PROFILE PHOTO</Text>
          <TouchableOpacity 
            onPress={() => pickImage('profile')} 
            style={[styles.uploadCircle, profileImg && styles.activeBorder]} 
            disabled={uploading}
          >
            {profileImg ? (
              <Image source={{ uri: profileImg }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Camera size={30} color="#6366f1" />
                <Text style={styles.placeholderText}>Take Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 40 }]}>GOVERNMENT ISSUED ID</Text>
          <TouchableOpacity 
            onPress={() => pickImage('id')} 
            style={[styles.idBox, idImg && styles.activeBorder]} 
            disabled={uploading}
          >
            {idImg ? (
              <Image source={{ uri: idImg }} style={styles.idImage} />
            ) : (
              <View style={styles.placeholder}>
                <CreditCard size={30} color="#6366f1" />
                <Text style={styles.placeholderText}>Upload ID (Passport/License)</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.trustBadge}>
             <ShieldCheck size={16} color="#10b981" />
             <Text style={styles.infoText}>Encrypted & secure verification.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.finishBtn, (!profileImg || !idImg || uploading) && styles.disabled]} 
            onPress={handleFinish}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.finishText}>Next Clearance</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleFinish} 
            disabled={uploading}
            style={styles.skipContainer}
          >
            <Text style={styles.skipLink}>Skip for now (I understand the limitations)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollInner: { paddingBottom: 60 },
  backButton: { marginTop: Platform.OS === 'ios' ? 60 : 40, marginLeft: 25, width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  header: { paddingHorizontal: 30, marginTop: 20 },
  stepIndicator: { color: '#6366f1', fontWeight: '800', fontSize: 11, marginBottom: 8, letterSpacing: 1.5 },
  title: { fontSize: 32, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 8, fontWeight: '500' },
  center: { alignItems: 'center', marginTop: 30, paddingHorizontal: 30 },
  label: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 12, letterSpacing: 1 },
  uploadCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  idBox: { width: '100%', height: 180, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  activeBorder: { borderStyle: 'solid', borderColor: '#6366f1', backgroundColor: '#f5f3ff' },
  image: { width: '100%', height: '100%', borderRadius: 70 },
  idImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: 8 },
  placeholderText: { color: '#6366f1', fontWeight: '800', fontSize: 13 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 25 },
  infoText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  footer: { paddingHorizontal: 30, marginTop: 40 },
  finishBtn: { backgroundColor: '#111827', padding: 22, borderRadius: 18, alignItems: 'center' },
  disabled: { backgroundColor: '#e2e8f0' },
  finishText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skipContainer: { marginTop: 25, alignItems: 'center' },
  skipLink: { textAlign: 'center', color: '#94a3b8', fontWeight: '700', textDecorationLine: 'underline', fontSize: 13 }
});