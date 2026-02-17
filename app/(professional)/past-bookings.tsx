import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Users, User, Briefcase, Calendar, CheckCircle2, ChevronRight, History } from "lucide-react-native";
import { db, auth } from "@/firebase/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

type PastJob = {
  id: string;
  service: string;
  client: string;
  completedAt: any;
  price: number;
  isCollab: boolean;
  squadMembers?: string[];
  status: string;
};

const formatZAR = (value: number) => `R ${Number(value || 0).toFixed(2)}`;

export default function PastBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<PastJob[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "jobs"),
      where("status", "==", "completed"),
      where("bidders", "array-contains", user.uid),
      orderBy("completedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isCollab: doc.data().squadMembers && doc.data().squadMembers.length > 0
      })) as PastJob[];
      setJobs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderJob = ({ item, index }: { item: PastJob; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100)}>
      <TouchableOpacity 
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: "/(professional)/job/[jobId]", params: { jobId: item.id } } as any)}
      >
        <View style={styles.cardHeader}>
          <View style={item.isCollab ? styles.collabBadge : styles.soloBadge}>
            {item.isCollab ? <Users size={12} color="#6366f1" /> : <User size={12} color="#10b981" />}
            <Text style={item.isCollab ? styles.collabText : styles.soloText}>
              {item.isCollab ? "Squad" : "Solo"}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {item.completedAt?.seconds 
              ? new Date(item.completedAt.seconds * 1000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) 
              : "Completed"}
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleArea}>
            <Text style={styles.serviceTitle} numberOfLines={1}>{item.service}</Text>
            <View style={styles.clientRow}>
                <Briefcase size={12} color="#94a3b8" />
                <Text style={styles.clientName}>{item.client}</Text>
            </View>
          </View>
          <View style={styles.priceArea}>
            <Text style={styles.priceText}>{formatZAR(item.price)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statusRow}>
            <CheckCircle2 size={14} color="#10b981" />
            <Text style={styles.completionText}>Earnings Released</Text>
          </View>
          <ChevronRight size={16} color="#cbd5e1" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job History</Text>
        <TouchableOpacity style={styles.headerIcon}>
            <History size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Calendar size={32} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No past jobs yet</Text>
              <Text style={styles.emptySub}>Your track record starts here. Win a bid and complete your first job!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, alignItems: "center" },
  soloBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  collabBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f5f3ff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  soloText: { fontSize: 11, fontWeight: "800", color: "#10b981", textTransform: 'uppercase' },
  collabText: { fontSize: 11, fontWeight: "800", color: "#6366f1", textTransform: 'uppercase' },
  dateText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  
  body: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titleArea: { flex: 1 },
  serviceTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  priceArea: { alignItems: 'flex-end' },
  priceText: { fontSize: 16, fontWeight: "900", color: "#1e293b" },

  cardFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderTopWidth: 1, 
    borderTopColor: "#f1f5f9", 
    paddingTop: 16 
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  completionText: { fontSize: 12, color: "#10b981", fontWeight: "700" },

  emptyState: { 
    alignItems: "center", 
    marginTop: 60, 
    backgroundColor: '#fff', 
    padding: 40, 
    borderRadius: 32, 
    borderStyle: 'dashed', 
    borderWidth: 1, 
    borderColor: '#cbd5e1' 
  },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 24, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 8, lineHeight: 20, paddingHorizontal: 10 },
});