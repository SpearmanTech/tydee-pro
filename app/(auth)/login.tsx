import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  StatusBar
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from "../../context/AuthContext";
import { KeyRound, Mail, ChevronRight, Phone } from "lucide-react-native";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Info", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(professional)");
    } catch (error: any) {
      console.error("Login Error:", error.code);
      let errorMessage = "An error occurred during sign in.";
      if (error.code === 'auth/invalid-credential') errorMessage = "Incorrect email or password.";
      if (error.code === 'auth/user-not-found') errorMessage = "No account found with this email.";
      
      Alert.alert("Sign In Failed", errorMessage);
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
          
          {/* HEADER SECTION */}
          <View style={styles.headerSection}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to your professional portal</Text>
          </View>

          {/* FORM SECTION */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <View style={styles.iconWrap}>
                <Mail size={18} color="#94a3b8" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.iconWrap}>
                <KeyRound size={18} color="#94a3b8" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]} 
              onPress={handleSignIn}
              disabled={loading}
            >
              <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <ChevronRight size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* PHONE SIGN IN BUTTON */}
            <TouchableOpacity 
              style={styles.phoneButton}
              onPress={() => router.push("/(auth)/phoneLogin")}
            >
              <Phone size={20} color="#6366f1" />
              <Text style={styles.phoneButtonText}>Sign in with Phone Number</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                if (loading) return;
                router.push("/register");
              }}
              style={styles.footerLink}
            >
              <Text style={styles.linkText}>
                New to Tydee? <Text style={styles.linkTextBold}>Join the community</Text>
              </Text>
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
  headerSection: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    transform: [{ rotate: '-10deg' }],
  },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "900" },
  brandName: { fontSize: 18, fontWeight: "800", color: "#6366f1", letterSpacing: -0.5 },
  welcomeTitle: { fontSize: 28, fontWeight: "800", color: "#1e293b", marginTop: 24 },
  welcomeSubtitle: { fontSize: 15, color: "#64748b", marginTop: 8, fontWeight: "500" },
  
  formSection: { paddingHorizontal: 32 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  iconWrap: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
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
    flexDirection: "row",
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
  
  // Divider
  divider: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginVertical: 24 
  },
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: "#e5e7eb" 
  },
  dividerText: { 
    marginHorizontal: 16, 
    color: "#9ca3af", 
    fontSize: 12, 
    fontWeight: "600" 
  },
  
  // Phone button
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#6366f1",
    backgroundColor: "#fff",
  },
  phoneButtonText: {
    color: "#6366f1",
    fontWeight: "700",
    fontSize: 15,
  },
  
  footerLink: { marginTop: 32 },
  linkText: { textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: "500" },
  linkTextBold: { color: "#6366f1", fontWeight: "700" }
});