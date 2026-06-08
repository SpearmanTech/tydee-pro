import { auth } from "@/firebase/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, Mail, Send } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        "Link Sent",
        "Check your email inbox for instructions to reset your password.",
        [{ text: "Back to Login", onPress: () => router.back() }],
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Error",
        "Could not send reset email. Please ensure the email is correct.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color="#1e293b" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to get back into your
          account.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail size={18} color="#94a3b8" style={styles.icon} />
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

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleReset}
          disabled={loading}
        >
          <LinearGradient
            colors={["#1e293b", "#0f172a"]}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Send Reset Link</Text>
                <Send size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 32 },
  backButton: {
    marginTop: 40,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  header: { marginTop: 40, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "800", color: "#1e293b" },
  subtitle: { fontSize: 15, color: "#64748b", marginTop: 12, lineHeight: 22 },
  form: { marginTop: 20 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
  primaryButton: { borderRadius: 20, overflow: "hidden" },
  buttonGradient: {
    flexDirection: "row",
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
