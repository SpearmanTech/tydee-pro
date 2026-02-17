import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StatusBar
} from "react-native";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, UserPlus, ArrowLeft } from "lucide-react-native";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/firebase/firebase";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

 const handleSignUp = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please fill in all fields.");
    return;
  }

  setLoading(true);
  try {
    // 1. Create the Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Send the verification email
    await sendEmailVerification(user);

    // 3. CREATE THE PROVISIONAL SHELL IMMEDIATELY
    // This solves the permission/existence error in the next screen
    await setDoc(doc(db, "provisional_signups", user.uid), {
      uid: user.uid,
      email: user.email,
      status: "pending_verification",
      createdAt: serverTimestamp(),
      // TTL: Auto-delete after 48 hours if verification isn't completed
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) 
    });

    // 4. Inform the user 
    Alert.alert(
      "Verify Your Email",
      `A verification link has been sent to ${email}. Please check your inbox to activate your Tydee profile.`,
      [{ text: "OK" }]
    );

  } catch (error: any) {
    console.error("Signup error:", error);
    let message = "An error occurred during sign up.";
    if (error.code === 'auth/email-already-in-use') message = "That email is already registered.";
    if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
    if (error.code === 'auth/invalid-email') message = "Please enter a valid email address.";
    
    Alert.alert("Registration Failed", message);
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
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
              <UserPlus size={32} color="#6366f1" />
            </View>
            <Text style={styles.title}>Join the Elite</Text>
            <Text style={styles.subtitle}>Create your professional profile and start receiving jobs.</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <View style={styles.iconWrap}><Mail size={18} color="#94a3b8" /></View>
              <TextInput 
                placeholder="Email Address" 
                value={email} 
                onChangeText={setEmail} 
                style={styles.input} 
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.iconWrap}><Lock size={18} color="#94a3b8" /></View>
              <TextInput 
                placeholder="Password" 
                value={password} 
                onChangeText={setPassword} 
                style={styles.input} 
                secureTextEntry 
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]} 
              onPress={handleSignUp} 
              disabled={loading}
            >
              <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.buttonGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.footerLink}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  backButton: { marginTop: 60, marginLeft: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" },
  headerSection: { paddingHorizontal: 32, paddingTop: 20, paddingBottom: 40 },
  iconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#f5f3ff", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 32, fontWeight: "900", color: "#1e293b" },
  subtitle: { fontSize: 16, color: "#64748b", marginTop: 12 },
  formSection: { paddingHorizontal: 32 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 20, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#f1f5f9" },
  iconWrap: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 18, fontSize: 15, color: "#1e293b" },
  primaryButton: { marginTop: 12, borderRadius: 20, overflow: "hidden" },
  buttonGradient: { paddingVertical: 20, justifyContent: "center", alignItems: "center" },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  footerLink: { marginTop: 32 },
  linkText: { textAlign: "center", color: "#64748b", fontSize: 14 },
  linkTextBold: { color: "#6366f1", fontWeight: "700" }
});