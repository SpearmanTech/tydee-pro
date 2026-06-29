import { auth, db, storage, functions } from "@/firebase/firebase";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Camera, ShieldCheck } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "../../../context/AuthContext";

// Only import WebBrowser on native — avoids warnings on web
const WebBrowser =
  Platform.OS !== "web" ? require("expo-web-browser") : null;

type UploadStep =
  | "idle"
  | "uploading-photo"
  | "creating-session"
  | "redirecting";

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  "uploading-photo": "Uploading your photo…",
  "creating-session": "Preparing secure verification…",
  redirecting: "Redirecting to ID check…",
};

export default function StepIdentity() {
  const { signOut } = useAuth();
  const [profileImg, setProfileImg] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const router = useRouter();

  const isUploading = uploadStep !== "idle";

  const handleBack = () => {
    Alert.alert("Exit Setup?", "You will be signed out.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "We need access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImg(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (uid: string): Promise<string> => {
    setUploadStep("uploading-photo");

    const profRes = await fetch(profileImg!);
    const profBlob = await profRes.blob();

    try {
      const profRef = ref(storage, `profileImages/${uid}.jpg`);
      await uploadBytes(profRef, profBlob);
      const profUrl = await getDownloadURL(profRef);

      await updateDoc(doc(db, "professionals", uid), {
        profileImage: profUrl,
        updatedAt: serverTimestamp(),
      });

      return profUrl;
    } finally {
      // Safe to close blob after upload completes (not before)
      profBlob.close?.();
    }
  };

  const createDiditSession = async (): Promise<string> => {
    setUploadStep("creating-session");

    const initDiditSession = httpsCallable(functions, "createDiditSession");
    const response = await initDiditSession({
      platform: Platform.OS === "web" ? "web" : "native",
    });

    const { url } = response.data as { url: string };
    if (!url) throw new Error("No verification URL returned from session.");
    return url;
  };

  const handleFinish = async () => {
    if (!profileImg) {
      Alert.alert("Missing Photo", "Please upload a profile photo to continue.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      // Step 1: Upload photo (must complete before redirect on web)
      await uploadProfileImage(user.uid);

      // Step 2: Create Didit session
      const url = await createDiditSession();

      // Step 3: Route to Didit based on platform
      setUploadStep("redirecting");

      if (Platform.OS === "web") {
        // Give the "Redirecting…" label a beat to render before the tab navigates
        await new Promise((resolve) => setTimeout(resolve, 300));
        window.location.href = url;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(
          url,
          "foona://"
        );
        if (result.type === "success") {
          router.push("/step-clearance");
        } else {
          // User cancelled or browser closed — reset so they can retry
          setUploadStep("idle");
        }
      }
    } catch (error: any) {
      console.error("DIDIT LAUNCH ERROR:", error);
      setUploadStep("idle");
      Alert.alert(
        "Verification Error",
        "Could not start the secure ID check. Please try again."
      );
    }
  };

  const handleSkip = () => {
    router.push("/step-clearance");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        disabled={isUploading}
      >
        <ArrowLeft size={24} color="#111827" />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollInner}
      >
        <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
          <Text style={styles.stepIndicator}>STEP 3 OF 4</Text>
          <Text style={styles.title}>Identity Verification</Text>
          <Text style={styles.subtitle}>
            Upload a profile photo and verify your ID securely.
          </Text>
        </Animated.View>

        <View style={styles.center}>
          <Text style={styles.label}>PROFESSIONAL PROFILE PHOTO</Text>
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.uploadCircle, profileImg && styles.activeBorder]}
            disabled={isUploading}
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

          <View style={styles.trustBadge}>
            <ShieldCheck size={16} color="#10b981" />
            <Text style={styles.infoText}>
              ID Verification handled securely by Didit.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.finishBtn,
              (!profileImg || isUploading) && styles.disabled,
            ]}
            onPress={handleFinish}
            disabled={!profileImg || isUploading}
          >
            {isUploading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>
                  {STEP_LABELS[uploadStep]}
                </Text>
              </View>
            ) : (
              <Text style={styles.finishText}>Start Secure ID Verification</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={isUploading}
            style={styles.skipContainer}
          >
            <Text style={styles.skipLink}>
              Skip for now (I understand the limitations)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollInner: { paddingBottom: 60 },
  backButton: {
    marginTop: Platform.OS === "ios" ? 60 : 40,
    marginLeft: 25,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  header: { paddingHorizontal: 30, marginTop: 20 },
  stepIndicator: {
    color: "#6366f1",
    fontWeight: "800",
    fontSize: 11,
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  title: { fontSize: 32, fontWeight: "900", color: "#1e293b" },
  subtitle: { fontSize: 15, color: "#64748b", marginTop: 8, fontWeight: "500" },
  center: { alignItems: "center", marginTop: 30, paddingHorizontal: 30 },
  label: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 12,
    letterSpacing: 1,
  },
  uploadCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  activeBorder: {
    borderStyle: "solid",
    borderColor: "#6366f1",
    backgroundColor: "#f5f3ff",
  },
  image: { width: "100%", height: "100%", borderRadius: 70 },
  placeholder: { alignItems: "center", gap: 8 },
  placeholderText: { color: "#6366f1", fontWeight: "800", fontSize: 13 },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 40,
  },
  infoText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  footer: { paddingHorizontal: 30, marginTop: 40 },
  finishBtn: {
    backgroundColor: "#111827",
    padding: 22,
    borderRadius: 18,
    alignItems: "center",
    minHeight: 64,
    justifyContent: "center",
  },
  disabled: { backgroundColor: "#e2e8f0" },
  finishText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  skipContainer: { marginTop: 25, alignItems: "center" },
  skipLink: {
    textAlign: "center",
    color: "#94a3b8",
    fontWeight: "700",
    textDecorationLine: "underline",
    fontSize: 13,
  },
});