import { db } from "@/firebase/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  Info,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function SquadJobDetails() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  const [squadJob, setSquadJob] = useState<any>(null);
  const [originalJob, setOriginalJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const unsubSquad = onSnapshot(
      doc(db, "squad_marketplace", jobId as string),
      async (snap) => {
        if (snap.exists()) {
          const squadData = snap.data();
          setSquadJob({ id: snap.id, ...squadData });

          if (squadData.originalJobId) {
            const jobSnap = await getDoc(
              doc(db, "jobs", squadData.originalJobId),
            );
            if (jobSnap.exists()) {
              setOriginalJob(jobSnap.data());
            }
          }
        }
        setLoading(false);
      },
    );

    return () => unsubSquad();
  }, [jobId]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );

  const members = squadJob?.confirmed_members
    ? Object.values(squadJob.confirmed_members)
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Squad Mission</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP STATUS CARD */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={["#1e293b", "#334155"]}
            style={styles.heroCard}
          >
            <View style={styles.typeBadge}>
              <Users size={12} color="#fff" />
              <Text style={styles.typeBadgeText}>SQUAD MISSION ACTIVE</Text>
            </View>
            <Text style={styles.heroTitle}>{squadJob?.title}</Text>
            <View style={styles.heroMeta}>
              <MapPin size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.heroMetaText}>{squadJob?.location}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150)}
          style={styles.actionRow}
        >
          {/* CALL BUTTON - Links to your new Directory */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "#f0fdf4", borderColor: "#dcfce7" },
            ]}
            onPress={() =>
              router.push({
                pathname: "/collaborations/squad-call",
                params: { jobId: squadJob?.id },
              })
            }
          >
            <View
              style={[styles.actionIconCircle, { backgroundColor: "#10b981" }]}
            >
              <Phone size={20} color="#fff" />
            </View>
            <Text style={[styles.actionLabelBtn, { color: "#166534" }]}>
              Call
            </Text>
          </TouchableOpacity>

          {/* CHAT BUTTON - Links to Group Chat */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "#eff6ff", borderColor: "#dbeafe" },
            ]}
            onPress={() =>
              router.push({
                pathname: "/collaborations/squad-chat",
                params: { jobId: squadJob?.id, jobTitle: squadJob?.title },
              })
            }
          >
            <View
              style={[styles.actionIconCircle, { backgroundColor: "#3b82f6" }]}
            >
              <MessageSquare size={20} color="#fff" />
            </View>
            <Text style={[styles.actionLabelBtn, { color: "#1e40af" }]}>
              Chat
            </Text>
          </TouchableOpacity>

          {/* ALERT BUTTON - Emergency Protocols */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "#fef2f2", borderColor: "#fee2e2" },
            ]}
            onPress={() =>
              Alert.alert(
                "Incident Report",
                "Would you like to notify all squad members and Tydee support of an emergency?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Send Alert",
                    style: "destructive",
                    onPress: () => console.log("Alert Sent"),
                  },
                ],
              )
            }
          >
            <View
              style={[styles.actionIconCircle, { backgroundColor: "#ef4444" }]}
            >
              <ShieldAlert size={20} color="#fff" />
            </View>
            <Text style={[styles.actionLabelBtn, { color: "#991b1b" }]}>
              Alert
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* SECTION: SERVICE CONFIGS */}
        <Text style={styles.sectionLabel}>JOB SPECIFICATIONS</Text>
        <View style={styles.specsContainer}>
          {originalJob?.services?.subService && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Service Type</Text>
              <Text style={styles.specValue}>
                {originalJob.services.subService}
              </Text>
            </View>
          )}

          {originalJob?.propertyDetails ? (
            Object.entries(originalJob.propertyDetails).map(
              ([key, value]: any) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specLabel}>
                    {key.replace(/([A-Z])/g, " $1").toUpperCase()}
                  </Text>
                  <Text style={styles.specValue}>
                    {typeof value === "boolean"
                      ? value
                        ? "Yes"
                        : "No"
                      : value}
                  </Text>
                </View>
              ),
            )
          ) : (
            <Text style={styles.emptyText}>
              Standard service requirements apply.
            </Text>
          )}
        </View>

        {/* SECTION: SQUAD MEMBERS */}
        <Text style={styles.sectionLabel}>
          CONFIRMED SQUAD ({members.length}/{squadJob?.membersNeeded})
        </Text>

        {members.length > 0 ? (
          members.map((member: any, index) => (
            <Animated.View
              key={index}
              entering={FadeInUp.delay(200 + index * 100)}
              style={styles.memberCard}
            >
              <View style={styles.memberAvatar}>
                <Users size={20} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <View style={styles.memberMeta}>
                  <ShieldCheck size={12} color="#10b981" />
                  <Text style={styles.memberStatus}>Verified Pro</Text>
                </View>
              </View>
              <View style={styles.payoutTag}>
                <Text style={styles.payoutText}>R{member.payout}</Text>
              </View>
            </Animated.View>
          ))
        ) : (
          <View style={styles.infoBox}>
            <Info size={18} color="#64748b" />
            <Text style={styles.infoText}>
              Waiting for professionals to join your squad.
            </Text>
          </View>
        )}

        {/* ECONOMICS SUMMARY */}
        <View style={styles.economicsCard}>
          <Text style={styles.econLabel}>Squad Payout per Member</Text>
          <Text style={styles.econValue}>R{squadJob?.payoutPerMember}</Text>
          <View style={styles.econDivider} />
          <Text style={styles.econSub}>
            Payments are held in Tydee Escrow and released to members
            automatically upon completion.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  scrollContent: { padding: 20 },
  heroCard: { borderRadius: 24, padding: 24, marginBottom: 25 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  typeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
  },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroMetaText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1.2,
    marginBottom: 15,
    marginLeft: 5,
  },
  specsContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 25,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  specLabel: { fontSize: 12, color: "#64748b", fontWeight: "700" },
  specValue: { fontSize: 13, color: "#1e293b", fontWeight: "800" },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberName: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  memberStatus: { fontSize: 11, color: "#10b981", fontWeight: "700" },
  payoutTag: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  payoutText: { color: "#16a34a", fontWeight: "900", fontSize: 13 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  infoText: { flex: 1, fontSize: 13, color: "#64748b", fontWeight: "500" },
  economicsCard: {
    marginTop: 15,
    padding: 20,
    backgroundColor: "#eef2ff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  econLabel: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "700",
    marginBottom: 4,
  },
  econValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#4338ca",
    marginBottom: 15,
  },
  econDivider: {
    height: 1,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    marginBottom: 15,
  },
  econSub: {
    fontSize: 11,
    color: "#6366f1",
    fontWeight: "500",
    lineHeight: 16,
  },
  emptyText: { fontSize: 13, color: "#94a3b8", textAlign: "center" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    aspectRatio: 1, // Ensures perfect square
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabelBtn: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
