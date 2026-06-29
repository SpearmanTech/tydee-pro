import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";
import { useAuth } from "../../../context/AuthContext";
import { ShieldCheck, XCircle, Clock } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

export default function VerifyCallback() {
  const { user, setIsOnboarded } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"waiting" | "approved" | "declined" | "review">("waiting");

  useEffect(() => {
    // We need a user UID to listen to their document
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;

    // Set up a real-time listener on the professional's database record.
    // We are waiting for the Didit Webhook to hit our server and update this exact document.
    const unsubscribe = onSnapshot(doc(db, "professionals", uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const identityStatus = data?.verification?.identity?.status;

       if (identityStatus === "approved") {
  setStatus("approved");
  setTimeout(() => {
    setIsOnboarded(true);
    router.replace("/(professional)/dashboard");
  }, 2000);
} else if (identityStatus === "declined") {
  setStatus("declined");
} else if (identityStatus === "in_review" || identityStatus === "in_progress") {
  // Catch the intermediate states
  setStatus("review");
}
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.content}>
        
        {/* STATE 1: WAITING FOR WEBHOOK */}
        {status === "waiting" && (
          <Animated.View entering={FadeIn} style={styles.stateContainer}>
            <View style={[styles.iconContainer, { backgroundColor: "#f8fafc" }]}>
              <Clock size={48} color="#64748b" />
            </View>
            <Text style={styles.title}>Verifying your identity...</Text>
            <Text style={styles.subtitle}>
              Didit is securely processing your scan. Please do not close this window, you will be redirected automatically.
            </Text>
            <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 24 }} />
          </Animated.View>
        )}

        {/* STATE 2: WEBHOOK APPROVED */}
        {status === "approved" && (
          <Animated.View entering={FadeIn} style={styles.stateContainer}>
            <View style={[styles.iconContainer, { backgroundColor: "#ecfdf5" }]}>
              <ShieldCheck size={48} color="#10b981" />
            </View>
            <Text style={styles.title}>Identity Verified!</Text>
            <Text style={styles.subtitle}>
              Your account is now fully secured. Redirecting you to your professional dashboard...
            </Text>
          </Animated.View>
        )}

{/* STATE 4: MANUAL REVIEW */}
{status === "review" && (
  <Animated.View entering={FadeIn} style={styles.stateContainer}>
    <View style={[styles.iconContainer, { backgroundColor: "#fffbeb" }]}>
      <Clock size={48} color="#d97706" />
    </View>
    <Text style={styles.title}>Under Manual Review</Text>
    <Text style={styles.subtitle}>
      Your ID is being manually reviewed by the verification team. This usually takes a few minutes. You can safely close this screen, and we will notify you when you are cleared!
    </Text>
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: "#0f172a" }]} 
      onPress={() => router.replace("/(professional)/dashboard")}
    >
      <Text style={styles.buttonText}>Go to Dashboard</Text>
    </TouchableOpacity>
  </Animated.View>
)}

        {/* STATE 3: WEBHOOK DECLINED */}
        {status === "declined" && (
          <Animated.View entering={FadeIn} style={styles.stateContainer}>
            <View style={[styles.iconContainer, { backgroundColor: "#fef2f2" }]}>
              <XCircle size={48} color="#ef4444" />
            </View>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.subtitle}>
              We could not verify your identity document. Please ensure you are in a well-lit room and the ID is clearly visible.
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => router.replace("/(professional)/(onboarding)/step-identity")}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateContainer: {
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 32,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});