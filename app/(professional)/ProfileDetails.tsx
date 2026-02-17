import { auth, db, storage } from "@/firebase/firebase";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { sendEmailVerification } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ArrowLeft, Camera, MailCheck, User } from "lucide-react-native";



export default function ProfileDetailsScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!name.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }

    try {
      await updateDoc(doc(db, "professionals", user.uid), {
        name: name.trim(),
        surname: surname.trim(),
        phoneNumber: phoneNumber.trim(),
        profileImage: avatar ?? "",
        displayName: `${name.trim()} ${surname.trim()}`.trim(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Success", "Profile updated successfully");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const ref = doc(db, "professionals", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        Alert.alert("Error", "Professional profile missing");
        return;
      }

      const data = snap.data();

      setName(data.name ?? "");
      setSurname(data.surname ?? "");
      setEmail(user.email ?? "");
      setPhoneNumber(data.phoneNumber ?? "");
      setAvatar(data.profileImage ?? null);
      setEmailVerified(user.emailVerified);
    };

    loadProfile();
  }, []);

  const handleVerifyEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;

    await sendEmailVerification(user);
    Alert.alert("Verification Sent", "Check your email");
  };

  const handlePickImage = async () => {
    const permission =
      Platform.OS !== "web"
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : { granted: true };

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const asset = result.assets[0];

      // 1. Create a blob from the image URI
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // 2. Reference to storage
      const storageRef = ref(storage, `profileImages/${user.uid}.jpg`);

      // 3. Upload the blob using uploadBytes
      await uploadBytes(storageRef, blob);

      // 4. Get the URL
      const downloadURL = await getDownloadURL(storageRef);

      // 5. Update Firestore
      // Note: Use "professionals" to match your loadProfile logic
      await updateDoc(doc(db, "professionals", user.uid), {
        profileImage: downloadURL,
        updatedAt: serverTimestamp(),
      });

      setAvatar(downloadURL);

      // 6. Clean up the blob to prevent memory leaks
      blob.close();

      Alert.alert("Success", "Photo updated!");
    } catch (e) {
      console.error("UPLOAD ERROR:", e);
      Alert.alert("Upload failed", "Could not upload image");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backBtn}>
          <ArrowLeft width={24} height={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Camera width={28} height={28} color="#4f46e5" />
            )}
          </TouchableOpacity>

          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <User width={18} height={18} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <User width={18} height={18} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Surname"
              value={surname}
              onChangeText={setSurname}
            />
          </View>

          <View style={styles.inputGroup}>
            <User width={18} height={18} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Email Verification */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Email Verification</Text>

          <View style={styles.emailRow}>
            <Text style={styles.emailText}>{email}</Text>
            <View
              style={[
                styles.badge,
                emailVerified ? styles.badgeSuccess : styles.badgeWarning,
              ]}
            >
              <Text style={styles.badgeText}>
                {emailVerified ? "Verified" : "Unverified"}
              </Text>
            </View>
          </View>

          {!emailVerified && (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleVerifyEmail}
            >
              <MailCheck width={18} height={18} color="#fff" />
              <Text style={styles.verifyBtnText}>Verify Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: { padding: 8 },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  profileCard: {
    alignItems: "center",
    marginBottom: 20,
  },

  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4f46e5",
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  emailText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeSuccess: {
    backgroundColor: "#dcfce7",
  },

  badgeWarning: {
    backgroundColor: "#fef3c7",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  verifyBtn: {
    marginTop: 8,
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  verifyBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  saveBtn: {
    marginTop: 8,
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
