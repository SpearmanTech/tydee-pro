import { db } from "@/firebase/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
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
  Alert
} from "react-native";

export default function SquadCallScreen() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  const [squadMembers, setSquadMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 FETCH ACTUAL SQUAD MEMBERS
  useEffect(() => {
    const fetchMembers = async () => {
      if (!jobId) return;
      try {
        const jobRef = await getDoc(doc(db, "squad_marketplace", jobId as string));
        if (jobRef.exists()) {
          const data = jobRef.data();
          
          // Filter to only get members who have an "accepted" status
          const acceptedBids = data.bids?.filter((bid: any) => bid.status === 'accepted') || [];
          
          // If we also want to show the Lead Pro:
          const members = [
            { 
              proId: data.leadProId, 
              proName: `${data.leadProName} (Lead)`, 
              phoneNumber: data.leadProPhone || null 
            },
            ...acceptedBids
          ];
          
          setSquadMembers(members);
        }
      } catch (error) {
        console.error("Error fetching squad:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [jobId]);

  // 🚀 THE NATIVE DIALER HOOK
  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("No Number", "This professional has not shared their phone number.");
      return;
    }
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Error", "Phone calling is not supported on this device.");
        } else {
          return Linking.openURL(phoneUrl);
        }
      })
      .catch((err) => console.error("An error occurred opening the dialer", err));
  };

  const renderMember = ({ item }: any) => (
    <View style={styles.memberCard}>
      <View style={styles.avatarBox}>
        <User color="#6366f1" size={24} />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.memberName}>{item.proName}</Text>
          <ShieldCheck color="#10b981" size={14} style={{ marginLeft: 6 }} />
        </View>
        <Text style={styles.memberRole}>
          {item.phoneNumber ? "Verified Contact" : "Number Hidden"}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.callBtn, !item.phoneNumber && { opacity: 0.5 }]} 
        onPress={() => handleCall(item.phoneNumber)}
      >
        <Phone color="#fff" size={18} />
      </TouchableOpacity>
    </View>
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
          <Text style={styles.headerSub}>Direct line to your team</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.center} />
      ) : (
        <FlatList
          data={squadMembers}
          keyExtractor={(item, idx) => item.proId + idx}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 50 }}>
              No members have joined this squad yet.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: Platform.OS === "ios" ? 60 : 40, paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerTextCont: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  headerSub: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center" },
  listContent: { padding: 20 },
  memberCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: "#f1f5f9", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  avatarBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#eef2ff", justifyContent: "center", alignItems: "center" },
  memberName: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  memberRole: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  callBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#10b981", justifyContent: "center", alignItems: "center", elevation: 3, shadowColor: "#10b981", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
});