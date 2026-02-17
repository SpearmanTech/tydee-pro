import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from "../../context/AuthContext";
import { Phone, ArrowLeft, Hash } from "lucide-react-native";

// COMMENTED OUT TO PREVENT BUNDLING ERROR
// import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

import { auth, db } from "@/firebase/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

export default function PhoneLoginScreen() {
  const { signInWithPhone } = useAuth();
  const router = useRouter();
  
  // Placeholder for the verifier since the modal is disabled
  const recaptchaVerifier = useRef(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendVerificationCode = async () => {
    // TEMPORARY REDIRECT FOR LAUNCH DAY
    Alert.alert(
      "Feature Coming Soon", 
      "Phone sign-in is being optimized for Durban. Please use Email & Password for now!",
      [{ text: "Use Email", onPress: () => router.back() }]
    );
    
    /* // This code stays commented until the new Auth method is added
    if (!phoneNumber.trim()) {
      Alert.alert("Missing Info", "Please enter your phone number.");
      return;
    }
    // ... rest of your logic
    */
  };

  const confirmVerificationCode = async () => {
  setLoading(true);
  try {
    // 1. Verify the OTP code first
    const credential = await verificationId.confirm(verificationCode);
    const user = credential.user;

    // 2. Only now do we check/create the Firestore document
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create the profile ONLY after successful verification
      await setDoc(userDocRef, {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        role: "professional",
        hasCompletedOnboarding: false, // This triggers onboarding in your _layout.tsx
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "professionals", user.uid), {
        uid: user.uid,
        isVerified: false,
        createdAt: serverTimestamp(),
      });
    }
    
    // AuthContext will pick up the 'user' and 'isOnboarded' status automatically
  } catch (error) {
    Alert.alert("Invalid Code", "Please check the code and try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* DISABLED: This component causes the @unimodules/core error 
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={auth.app.options}
          attemptInvisibleVerification={true}
        />
      */}

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <Phone size={32} color="#6366f1" />
            </View>
            <Text style={styles.title}>Phone Sign In</Text>
            <Text style={styles.subtitle}>
              {!verificationId 
                ? "Enter your phone number to receive a verification code" 
                : "Enter the 6-digit code sent to your phone"}
            </Text>
          </View>

          {!verificationId ? (
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <View style={styles.iconWrap}>
                  <Phone size={18} color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (e.g., 0812345678)"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, loading && styles.buttonDisabled]} 
                onPress={sendVerificationCode}
                disabled={loading}
              >
                <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.buttonGradient}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formSection}>
              {/* Verification Code UI remains visible but unreachable for now */}
              <View style={styles.inputContainer}>
                <View style={styles.iconWrap}>
                  <Hash size={18} color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, loading && styles.buttonDisabled]} 
                onPress={() => {}} // Disabled for now
                disabled={loading}
              >
                <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={() => router.back()} style={styles.footerLink}>
            <Text style={styles.linkText}>
              Use <Text style={styles.linkTextBold}>Email & Password</Text> instead
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ... styles stay the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  backButton: { 
    marginTop: 60, 
    marginLeft: 20, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "#f8fafc", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  headerSection: { 
    paddingHorizontal: 32,
    paddingTop: 20, 
    paddingBottom: 40 
  },
  iconCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 20, 
    backgroundColor: "#f5f3ff", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 24 
  },
  title: { fontSize: 32, fontWeight: "900", color: "#1e293b" },
  subtitle: { fontSize: 16, color: "#64748b", marginTop: 12, lineHeight: 24 },
  
  formSection: { paddingHorizontal: 32 },
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#f8fafc", 
    borderRadius: 20, 
    marginBottom: 16, 
    paddingHorizontal: 16, 
    borderWidth: 1, 
    borderColor: "#f1f5f9" 
  },
  iconWrap: { marginRight: 12 },
  input: { 
    flex: 1, 
    paddingVertical: 18, 
    fontSize: 15, 
    color: "#1e293b", 
    fontWeight: "600" 
  },
  primaryButton: { 
    marginTop: 12, 
    borderRadius: 20, 
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonGradient: { 
    paddingVertical: 20, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  resendLink: { marginTop: 16, alignItems: "center" },
  footerLink: { marginTop: 32, paddingHorizontal: 32 },
  linkText: { textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: "500" },
  linkTextBold: { color: "#6366f1", fontWeight: "700" }
});