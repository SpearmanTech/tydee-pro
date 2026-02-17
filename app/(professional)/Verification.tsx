// verification
import { auth, db, storage } from "@/firebase/firebase";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ArrowLeft, ShieldCheck, UploadCloud } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
const StatusBadge = ({ status }: { status: string }) => {
  const isSubmitted = status === "submitted";
  return (
    <View
      style={[
        styles.badge,
        isSubmitted ? styles.badgeSuccess : styles.badgePending,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isSubmitted ? "#065f46" : "#92400e" },
        ]}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
};
export default function VerificationScreen() {
  const [uploading, setUploading] = useState(false);
  const user = auth.currentUser;

  if (!user) return null;
  const [statuses, setStatuses] = useState({
    identity: "pending",
    clearance: "pending",
  });

  // Load statuses on mount
  useEffect(() => {
    const fetchStatus = async () => {
      const snap = await getDoc(doc(db, "professionals", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setStatuses({
          identity: data.verification?.identity?.status || "pending",
          clearance: data.verification?.clearance?.status || "pending",
        });
      }
    };
    fetchStatus();
  }, []);
  const uploadDocument = async (type: "identity" | "clearance") => {
    try {
      setUploading(true);

      // 1. Request Camera Permissions
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Camera access is required.");
        return;
      }

      // 2. Launch Camera
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7, // Slightly lower quality to speed up upload
        allowsEditing: true,
      });

      if (result.canceled) return;
      const asset = result.assets[0];

      // 3. Convert URI to Blob (The fix for the ArrayBuffer error)
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // 4. Create Storage Reference
      const fileRef = ref(storage, `verifications/${user.uid}/${type}.jpg`);

      // 5. Upload using uploadBytes
      await uploadBytes(fileRef, blob);

      // 6. Get the URL
      const downloadURL = await getDownloadURL(fileRef);

      // 7. Update Firestore with nested object notation
      // We use quotes for keys with dots to update specific nested fields
      await updateDoc(doc(db, "professionals", user.uid), {
        [`verification.${type}`]: {
          status: "submitted",
          documentUrl: downloadURL,
          submittedAt: serverTimestamp(),
        },
      });

      // 8. Cleanup
      blob.close();

      Alert.alert("Submitted", "Your document has been submitted for review.");
    } catch (e) {
      console.error("UPLOAD ERROR:", e);
      Alert.alert("Error", "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backBtn}>
          <ArrowLeft width={24} height={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subTitle}>
        Complete verification to activate your professional account.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={18} color="#4f46e5" />
          <Text style={styles.cardTitle}>Identity Verification</Text>
          <StatusBadge status={statuses.identity} />
        </View>

        <Text style={styles.cardSub}>
          Government-issued ID (passport, ID card, or driver’s license)
        </Text>

        <View style={styles.metaList}>
          <Text style={styles.metaItem}>• Must be valid and unexpired</Text>
          <Text style={styles.metaItem}>• All corners clearly visible</Text>
          <Text style={styles.metaItem}>• No blur or glare</Text>
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => uploadDocument("identity")}
          disabled={uploading}
        >
          <UploadCloud size={16} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Upload Identity Document</Text>
        </Pressable>
      </View>

      {/* Background Check */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={18} color="#059669" />
          <Text style={styles.cardTitle}>Background Check</Text>
          <StatusBadge status={statuses.clearance} />
        </View>

        <Text style={styles.cardSub}>
          Police clearance or criminal record document
        </Text>

        <View style={styles.metaList}>
          <Text style={styles.metaItem}>• Issued within last 6 months</Text>
          <Text style={styles.metaItem}>• Must match legal name</Text>
          <Text style={styles.metaItem}>
            • Reviewed for platform eligibility
          </Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: "#111827" }]}
          onPress={() => uploadDocument("clearance")}
          disabled={uploading}
        >
          <UploadCloud size={16} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Upload Background Document</Text>
        </Pressable>
      </View>

      {uploading && (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 16,
  },

  header: {
    paddingTop: Platform.OS === "ios" ? 40 : 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  subTitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: "auto", // Pushes badge to the right
  },
  badgeSuccess: {
    backgroundColor: "#d1fae5",
  },
  badgePending: {
    backgroundColor: "#fef3c7",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  cardSub: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 10,
  },

  metaList: {
    marginBottom: 14,
  },

  metaItem: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 4,
  },

  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    borderRadius: 10,
  },

  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
