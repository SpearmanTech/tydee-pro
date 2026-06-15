import { auth, db } from "@/firebase/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  LayoutDashboard, // 👈 FIXED ICON IMPORT
  Plus,
  Radar,
  Users,
} from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SquadLeadDashboard() {
  const router = useRouter();
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "squad_marketplace"),
      where("leadProId", "==", user.uid),
    );

    const unsub = onSnapshot(q, (snap) => {
      const jobs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setActiveJobs(jobs);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 🚀 WEB BACK BUTTON FIX
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback for Web if the user refreshed the page and lost history
      router.replace("/(professional)/dashboard");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Squad Control</Text>
        <TouchableOpacity style={styles.historyBtn}>
          <LayoutDashboard size={20} color="#6366f1" /> {/* 👈 FIXED ICON USAGE */}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={["#1e293b", "#334155"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.heroTitle}>Lead Professional</Text>
                <Text style={styles.heroSub}>
                  Manage your sub-contracts and squad splits.
                </Text>
              </View>
              <View style={styles.iconCircle}>
                <Users color="#fff" size={28} />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* PRIMARY ACTIONS */}
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[styles.createBtn, { flex: 1 }]}
            activeOpacity={0.9}
            onPress={() => router.push("/collaborations/create-squad-job")}
          >
            <Plus color="#fff" size={20} />
            <Text style={styles.createBtnText}>New Squad</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createBtn, { flex: 1, backgroundColor: "#0f172a" }]}
            activeOpacity={0.9}
            onPress={() =>
              router.push("/collaborations/squad-marketplace" as any)
            }
          >
            <Radar color="#fff" size={20} />
            <Text style={styles.createBtnText}>Join Squad</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION: ACTIVE SQUADS */}
        <Text style={styles.sectionLabel}>MY ACTIVE SQUADS</Text>

        {loading ? (
          <ActivityIndicator color="#6366f1" style={{ marginVertical: 30 }} />
        ) : activeJobs.length > 0 ? (
          activeJobs.map((job) => (
            <View key={job.id}>
              <TouchableOpacity
                style={styles.jobCard}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/collaborations/squad-job-details",
                    params: { jobId: job.id },
                  })
                }
              >
                <View style={styles.jobInfo}>
                  <View style={styles.jobIconContainer}>
                    <ClipboardList color="#6366f1" size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <View style={styles.jobMeta}>
                      <Text style={styles.jobStatus}>
                        {job.status?.toUpperCase()}
                      </Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.jobSquad}>
                        {job.membersNeeded} Pros Needed
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>R{job.payoutPerMember}</Text>
                </View>
                <ChevronRight size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No active squad jobs. Scale your project by hiring other pros.
            </Text>
          </View>
        )}

        {/* SECTION: SQUAD WALLET */}
        <Text style={styles.sectionLabel}>SQUAD ECONOMICS</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <DollarSign size={16} color="#10b981" />
          </View>
          <Text style={styles.infoText}>
            Payments are automatically split upon job completion. Your Lead fee
            is protected by Foona Escrow.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  heroWrapper: { marginBottom: 20 },
  heroCard: { borderRadius: 24, padding: 25 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    maxWidth: "80%",
  },

  actionButtonRow: { flexDirection: "row", gap: 12, marginBottom: 30 },
  createBtn: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1.2,
    marginBottom: 15,
    marginLeft: 5,
  },
  jobCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  jobInfo: { flexDirection: "row", flex: 1, alignItems: "center" },
  jobIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  jobMeta: { flexDirection: "row", alignItems: "center" },
  jobStatus: { fontSize: 11, color: "#6366f1", fontWeight: "800" },
  jobSquad: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  dot: { marginHorizontal: 6, color: "#cbd5e1" },
  priceTag: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 10,
  },
  priceText: { color: "#16a34a", fontWeight: "900", fontSize: 13 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  infoIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 18,
  },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20,
  },
});