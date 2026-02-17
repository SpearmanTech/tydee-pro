import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "@/firebase/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Users, User, MapPin, Calendar, CreditCard, Clock, Star } from "lucide-react-native";

type CompletedJob = {
  id: string;
  service: string;
  client: string;
  completedAt: any;
  price: number;
  isCollab: boolean;
  property_address: string;
  rating?: number;
  duration?: string; // If you track job duration
};

export default function CompletedJobs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<CompletedJob[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetching all jobs where status is completed and pro was involved
    const q = query(
      collection(db, "jobs"),
      where("status", "in", ["completed", "Completed"]),
      where("bidders", "array-contains", user.uid),
      orderBy("completedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isCollab: doc.data().squadMembers && doc.data().squadMembers.length > 0
      })) as CompletedJob[];
      setJobs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatZAR = (value: number) => `R ${Number(value || 0).toFixed(2)}`;

  const renderJob = ({ item }: { item: CompletedJob }) => (
    <View style={styles.jobCard}>
      {/* SECTION 1: HEADER & STATUS */}
      <View style={styles.cardHeader}>
        <View style={item.isCollab ? styles.collabBadge : styles.soloBadge}>
          {item.isCollab ? <Users size={12} color="#6366f1" /> : <User size={12} color="#059669" />}
          <Text style={item.isCollab ? styles.collabText : styles.soloText}>
            {item.isCollab ? "Squad Collab" : "Individual"}
          </Text>
        </View>
        <View style={styles.ratingRow}>
          <Star size={14} color={item.rating ? "#f59e0b" : "#d1d5db"} fill={item.rating ? "#f59e0b" : "transparent"} />
          <Text style={styles.ratingText}>{item.rating || "N/A"}</Text>
        </View>
      </View>

      {/* SECTION 2: SERVICE & CLIENT */}
      <Text style={styles.serviceTitle}>{item.service}</Text>
      <Text style={styles.clientName}>Client: {item.client}</Text>

      {/* SECTION 3: KEY INFO GRID */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Calendar size={14} color="#6b7280" />
          <Text style={styles.infoText}>
            {item.completedAt?.seconds ? new Date(item.completedAt.seconds * 1000).toLocaleDateString() : "N/A"}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Clock size={14} color="#6b7280" />
          <Text style={styles.infoText}>{item.duration || "Closed"}</Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <MapPin size={14} color="#6b7280" />
        <Text style={styles.addressText} numberOfLines={1}>{item.property_address}</Text>
      </View>

      {/* SECTION 4: FOOTER & PRICE */}
      <View style={styles.cardFooter}>
        <View style={styles.paymentStatus}>
          <CreditCard size={14} color="#059669" />
          <Text style={styles.paymentText}>Earnings Released</Text>
        </View>
        <Text style={styles.priceText}>{formatZAR(item.price)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* FIXED HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="documents-outline" size={60} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No completed jobs</Text>
              <Text style={styles.emptySub}>Your work history will appear here once you finish your first task.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  backBtn: { padding: 4 },
  listContent: { padding: 16 },
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  soloBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  collabBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eef2ff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  soloText: { fontSize: 10, fontWeight: "700", color: "#059669" },
  collabText: { fontSize: 10, fontWeight: "700", color: "#4338ca" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  serviceTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  clientName: { fontSize: 13, color: "#4b5563", marginVertical: 4 },
  infoGrid: { flexDirection: "row", gap: 20, marginVertical: 8 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, color: "#6b7280" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  addressText: { fontSize: 12, color: "#6b7280", flex: 1 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    marginTop: 4,
  },
  paymentStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  paymentText: { fontSize: 11, fontWeight: "700", color: "#059669" },
  priceText: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 8, paddingHorizontal: 40 },
});