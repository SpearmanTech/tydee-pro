import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Layout,
  Plus,
  Users,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

export default function SquadLeadDashboard() {
  const router = useRouter();

  // Example state for active squad jobs
  const [activeJobs, setActiveJobs] = useState([
    {
      id: "1",
      title: "Estate Deep Clean",
      squadSize: 2,
      offer: "R850",
      status: "Pending Bids",
    },
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Squad Control</Text>
        <TouchableOpacity style={styles.historyBtn}>
          <Layout size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION - THE POWER STATEMENT */}
        <Animated.View entering={FadeInDown.delay(100)}>
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
        </Animated.View>

        {/* PRIMARY ACTION */}
        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.9}
          onPress={() => router.push("/collaborations/create-squad-job")}
        >
          <Plus color="#fff" size={24} />
          <Text style={styles.createBtnText}>Create Squad Job</Text>
        </TouchableOpacity>

        {/* SECTION: ACTIVE SQUADS */}
        <Text style={styles.sectionLabel}>ACTIVE SQUAD JOBS</Text>

        {activeJobs.length > 0 ? (
          activeJobs.map((job, index) => (
            <Animated.View
              key={job.id}
              entering={FadeInRight.delay(200 + index * 100)}
            >
              <TouchableOpacity style={styles.jobCard}>
                <View style={styles.jobInfo}>
                  <View style={styles.jobIconContainer}>
                    <ClipboardList color="#6366f1" size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <View style={styles.jobMeta}>
                      <Text style={styles.jobStatus}>{job.status}</Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.jobSquad}>
                        {job.squadSize} Pros Needed
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>{job.offer}</Text>
                </View>
                <ChevronRight size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No active squad jobs. Scale your project by hiring other pros.
            </Text>
          </View>
        )}

        {/* SECTION: SQUAD WALLET / EARNINGS PREVIEW */}
        <Text style={styles.sectionLabel}>SQUAD ECONOMICS</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <DollarSign size={16} color="#10b981" />
          </View>
          <Text style={styles.infoText}>
            Payments are automatically split upon job completion. Your Lead fee
            is protected by Tydee Escrow.
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
  scrollContent: { padding: 20 },
  heroCard: { borderRadius: 24, padding: 25, marginBottom: 20 },
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
  createBtn: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 30,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
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
  jobStatus: { fontSize: 12, color: "#6366f1", fontWeight: "700" },
  jobSquad: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  dot: { marginHorizontal: 6, color: "#cbd5e1" },
  priceTag: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 10,
  },
  priceText: { color: "#16a34a", fontWeight: "800", fontSize: 13 },
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
