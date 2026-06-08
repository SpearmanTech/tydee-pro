import { db } from "@/firebase/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, Phone, ShieldCheck, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

// MOCK DATA FOR TESTING
const MOCK_MEMBERS = [
  {
    id: "mock1",
    name: "Thabo Mokoena",
    phoneNumber: "0821234567",
    isVerified: true,
  },
  {
    id: "mock2",
    name: "Sarah Jenkins",
    phoneNumber: "0719876543",
    isVerified: true,
  },
  {
    id: "mock3",
    name: "David Gumede",
    phoneNumber: "0605550192",
    isVerified: true,
  },
];

export default function SquadCallScreen() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  const [squadMembers, setSquadMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If testing without a jobId, skip the Firebase call and show mocks
    if (!jobId) {
      setSquadMembers(MOCK_MEMBERS);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "squad_marketplace", jobId as string),
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const memberIds = data.confirmed_members
            ? Object.keys(data.confirmed_members)
            : [];

          if (memberIds.length > 0) {
            const memberProfiles = await Promise.all(
              memberIds.map(async (id) => {
                const proSnap = await getDoc(doc(db, "professionals", id));
                return { id, ...(proSnap.data() || {}) };
              }),
            );
            setSquadMembers(memberProfiles);
          } else {
            // Fallback to mocks if no real members confirmed yet
            setSquadMembers(MOCK_MEMBERS);
          }
        } else {
          // Fallback for document non-existence
          setSquadMembers(MOCK_MEMBERS);
        }
        setLoading(false);
      },
    );

    return () => unsub();
  }, [jobId]);

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    });
  };

  const renderMember = ({ item, index }: any) => (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => handleCall(item.phoneNumber)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarBox}>
          <User size={24} color="#6366f1" />
        </View>

        <View style={styles.infoCont}>
          <Text style={styles.memberName}>{item.name}</Text>
          <View style={styles.statusRow}>
            <ShieldCheck size={12} color="#10b981" />
            <Text style={styles.statusText}>Verified Professional</Text>
          </View>
        </View>

        <View style={styles.callIconBtn}>
          <Phone size={20} color="#fff" fill="#fff" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTextCont}>
          <Text style={styles.headerTitle}>Squad Directory</Text>
          <Text style={styles.headerSub}>
            {squadMembers.length} Pros Assigned
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={squadMembers}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextCont: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  headerSub: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center" },
  listContent: { padding: 20 },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    // Slight shadow for a premium feel
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoCont: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statusText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  callIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
});
