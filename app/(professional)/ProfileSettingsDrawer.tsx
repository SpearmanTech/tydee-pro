import { auth, db } from "@/firebase/firebase";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import {
  Briefcase,
  ChevronRight,
  LogOut,
  MapPin,
  ShieldCheck,
  User,
  Users,
  X,
  Phone,
  Settings,
} from "lucide-react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProfileSettingsDrawer({ visible, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const [profileData, setProfileData] = useState({
    name: "Loading...",
    phone: "...",
    profileImage: null,
    services: [] as string[],
    isVerified: false,
    isCleared: false,
  });

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId || !visible) return;

    const unsub = onSnapshot(doc(db, "professionals", userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileData({
          name: data.name || data.displayName || data.businessName || "Tydee Pro",
          phone: data.phoneNumber || "No phone added",
          profileImage: data.profileImage || null,
          services: data.services || [],
          isVerified: data.isVerified || false,
          isCleared: data.isCleared || false,
        });
      }
    });

    return () => unsub();
  }, [visible]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : -320,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const handleSignOut = async () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          onClose();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleSwitchUser = async () => {
    await signOut(auth);
    onClose();
    router.replace("/(auth)/login");
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Settings width={18} height={18} color="#6366f1" />
            <Text style={styles.headerTitle}>Account Settings</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X width={20} height={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* PROFILE CARD - PREMIUM HERO */}
          <Pressable
            style={styles.profileCard}
            onPress={() => { onClose(); router.push("/(professional)/ProfileDetails"); }}
          >
            <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.profileGradient}>
              <View style={styles.avatarContainer}>
                {profileData.profileImage ? (
                  <Image source={{ uri: profileData.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}><User width={32} height={32} color="#94a3b8" /></View>
                )}
                <View style={styles.editBadge}><Settings width={10} height={10} color="#fff" /></View>
              </View>
              <View style={styles.profileTextInfo}>
                <Text style={styles.proName} numberOfLines={1}>{profileData.name}</Text>
                <View style={styles.phoneRow}>
                  <Phone width={12} height={12} color="#64748b" />
                  <Text style={styles.proPhone}>{profileData.phone}</Text>
                </View>
              </View>
              <ChevronRight width={18} height={18} color="#cbd5e1" />
            </LinearGradient>
          </Pressable>

          {/* VERIFICATION SECTION */}
          <Text style={styles.sectionLabel}>TRUST & STATUS</Text>
          <Pressable style={styles.card} onPress={() => { onClose(); router.push("/(professional)/Verification"); }}>
            <View style={styles.cardHeader}>
              <ShieldCheck width={18} height={18} color="#10b981" />
              <Text style={styles.cardTitle}>Identity & Safety</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>ID Verification</Text>
              <Text style={profileData.isVerified ? styles.verified : styles.pending}>
                {profileData.isVerified ? "Verified" : "Pending"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Background Check</Text>
              <Text style={profileData.isCleared ? styles.verified : styles.pending}>
                {profileData.isCleared ? "Cleared" : "Pending"}
              </Text>
            </View>
          </Pressable>

          {/* SERVICES SECTION */}
          <Text style={styles.sectionLabel}>WORK PREFERENCES</Text>
          <Pressable style={styles.card} onPress={() => { onClose(); router.push("/(professional)/ServicesAndLocation"); }}>
            <View style={styles.cardHeader}>
              <Briefcase width={18} height={18} color="#6366f1" />
              <Text style={styles.cardTitle}>Expertise</Text>
            </View>
            <View style={styles.servicesList}>
              {profileData.services.length === 0 ? (
                <Text style={styles.emptySub}>No services configured</Text>
              ) : (
                profileData.services.map((service, idx) => (
                  <View key={idx} style={styles.serviceTag}>
                    <Text style={styles.serviceTagText}>{service}</Text>
                  </View>
                ))
              )}
            </View>
          </Pressable>

          <Pressable style={styles.card} onPress={() => { onClose(); router.push("/(professional)/ServicesAndLocation"); }}>
            <View style={styles.cardHeader}>
              <MapPin width={18} height={18} color="#f59e0b" />
              <Text style={styles.cardTitle}>Service Area</Text>
            </View>
            <Text style={styles.locationText}>South Africa (Local & Surrounds)</Text>
          </Pressable>

          {/* ACTIONS */}
          <Text style={styles.sectionLabel}>SYSTEM</Text>
          <TouchableOpacity style={styles.actionRow} onPress={handleSwitchUser}>
            <Users width={18} height={18} color="#64748b" />
            <Text style={styles.actionText}>Switch Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.dangerBg]} onPress={handleSignOut}>
            <LogOut width={18} height={18} color="#ef4444" />
            <Text style={styles.dangerText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 320,
    backgroundColor: "#ffffff",
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  closeBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 1.5, marginBottom: 12, marginTop: 10, marginLeft: 4 },
  
  profileCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  profileGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6366f1', width: 20, height: 20, borderRadius: 10, borderOuterWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  profileTextInfo: { flex: 1, marginLeft: 16 },
  proName: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  proPhone: { fontSize: 12, color: "#64748b", fontWeight: "600" },

  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  statusRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  statusLabel: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  verified: { color: "#10b981", fontWeight: "800", fontSize: 12 },
  pending: { color: "#f59e0b", fontWeight: "700", fontSize: 12 },

  servicesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceTag: { backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  serviceTagText: { color: '#6366f1', fontSize: 11, fontWeight: '700' },
  locationText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  emptySub: { fontSize: 12, color: "#94a3b8", fontStyle: "italic" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, marginBottom: 8 },
  actionText: { fontSize: 14, fontWeight: "700", color: "#475569" },
  dangerBg: { backgroundColor: '#fef2f2' },
  dangerText: { fontSize: 14, fontWeight: "700", color: "#ef4444" },
});