import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StatusBar 
} from "react-native";
import { auth, db } from "@/firebase/firebase";
import { sendEmailVerification, reload, signOut } from "firebase/auth";
import { useAuth } from "../../context/AuthContext"; // Adjust path as needed
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, // <--- Add this
  serverTimestamp 
} from "firebase/firestore";
import { Mail, CheckCircle2, RefreshCw, LogOut } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";

export default function VerifyEmailScreen() {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth(); 
  

 const checkVerification = async () => {
  setChecking(true);
  try {
    const user = auth.currentUser;
    if (!user) return;

    await reload(user);
    await user.getIdToken(true); 

    if (user.emailVerified) {
      const tempRef = doc(db, "provisional_signups", user.uid);
      const userRef = doc(db, "users", user.uid);
      const profRef = doc(db, "professionals", user.uid);

      const tempSnap = await getDoc(tempRef);
      const businessData = tempSnap.exists() ? tempSnap.data() : {};

      // 1. Move to users (This triggers the AuthContext listener)
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: "professional",
        hasCompletedOnboarding: false, // Keep them in onboarding
        createdAt: serverTimestamp(),
      }, { merge: true });

      // 2. Move data to professionals
      await setDoc(userRef, {
  uid: user.uid,
  email: user.email,
  role: "professional",
  hasCompletedOnboarding: false, // This is key
  createdAt: serverTimestamp(),
}, { merge: true });

      // 3. Delete the buffer doc (Requires the import above!)
      if (tempSnap.exists()) {
        await deleteDoc(tempRef);
      }

      // 4. Force Navigation
      // Replace with your EXACT path to the first onboarding step
      router.push("/(professional)/(onboarding)/step-business-info");

     if (tempSnap.exists()) {
  await deleteDoc(tempRef);
} 
      
    } else {
      Alert.alert("Pending", "Please verify your email first.");
    }
  } catch (error: any) {
    console.error("Migration Error:", error);
    Alert.alert("Error", error.message);
  } finally {
    setChecking(false);
  }
};

  const handleResend = async () => {
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser!);
      Alert.alert("Sent!", "A new verification link has been sent to your inbox.");
    } catch (error) {
      Alert.alert("Limit Reached", "Please wait a moment before requesting another link.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Mail size={40} color="#6366f1" />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to{"\n"}
          <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
        </Text>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={checkVerification} 
          disabled={checking}
        >
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.buttonGradient}>
            {checking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <CheckCircle2 size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>I've Verified My Email</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleResend} 
          disabled={resending} 
          style={styles.resendButton}
        >
          {resending ? (
            <ActivityIndicator color="#6366f1" size="small" />
          ) : (
            <Text style={styles.resendText}>Didn't get an email? <Text style={styles.resendTextBold}>Resend</Text></Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => signOut(auth)}
      >
        <LogOut size={18} color="#94a3b8" />
        <Text style={styles.logoutText}>Cancel & Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 32 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 35,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
  subtitle: { textAlign: 'center', color: '#64748b', fontSize: 16, lineHeight: 24, marginBottom: 40 },
  emailText: { color: '#1e293b', fontWeight: '700' },
  primaryButton: { width: '100%', borderRadius: 20, overflow: "hidden", elevation: 4 },
  buttonGradient: { paddingVertical: 18, alignItems: "center" },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  resendButton: { marginTop: 24 },
  resendText: { color: '#64748b', fontSize: 14 },
  resendTextBold: { color: '#6366f1', fontWeight: '700' },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 40 
  },
  logoutText: { color: '#94a3b8', fontWeight: '600', marginLeft: 8 }
});