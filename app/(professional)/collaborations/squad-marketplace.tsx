import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Users, Radar, ArrowLeft, Briefcase, ChevronRight } from "lucide-react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate, FadeIn, FadeInDown } from "react-native-reanimated";
import { auth, db } from "@/firebase/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function SquadMarketplace() {
  const router = useRouter();
  const [availableSquads, setAvailableSquads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch jobs that are actively recruiting
    const q = query(
      collection(db, "squad_marketplace"),
      where("status", "==", "recruiting")
    );

    const unsub = onSnapshot(q, (snap) => {
      const jobs = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        // Filter out jobs created by the current user
        .filter((job: any) => job.leadProId !== user.uid);

      setAvailableSquads(jobs);
      
      // Let the cool radar animation play for at least 2.5 seconds!
      setTimeout(() => setLoading(false), 2500);
    });

    return () => unsub();
  }, []);

  const handleJoinSquad = async (jobId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "squad_marketplace", jobId), {
        bids: arrayUnion({
          proId: user.uid,
          proName: user.displayName || "Professional",
          status: "pending",
          timestamp: new Date().toISOString()
        })
      });
      Alert.alert("Request Sent!", "The Lead Pro has been notified of your interest.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not join squad.");
    }
  };

  // 🚀 SHOW RADAR ANIMATION WHILE LOADING
  if (loading) {
    return <PremiumSearchingState />;
  }

  // 🚀 SHOW ACTUAL MARKETPLACE ONCE LOADED
  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Squads</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={availableSquads}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Radar size={40} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No squads recruiting in your area right now.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          // Check if user already requested to join
          const hasRequested = item.bids?.some((bid: any) => bid.proId === auth.currentUser?.uid);

          return (
            <Animated.View entering={FadeInDown.delay(index * 100)}>
              <View style={styles.jobCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.jobIconBox}>
                    <Briefcase size={20} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.leadProText}>Lead Pro: {item.leadProName}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailPill}>
                    <Users size={14} color="#64748b" />
                    <Text style={styles.detailText}>{item.membersNeeded} Pros Needed</Text>
                  </View>
                  <View style={styles.payoutBox}>
                    <Text style={styles.payoutText}>R{item.payoutPerMember}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.joinBtn, hasRequested && styles.joinedBtn]} 
                  onPress={() => handleJoinSquad(item.id)}
                  disabled={hasRequested}
                >
                  <Text style={styles.joinBtnText}>
                    {hasRequested ? "Request Pending" : "Request to Join Squad"}
                  </Text>
                  {!hasRequested && <ChevronRight size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

// --- RADAR ANIMATION COMPONENT (PRESERVED) ---
function PremiumSearchingState() {
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2000 }), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 4]) }],
    opacity: interpolate(pulse.value, [0, 0.5, 1], [0.8, 0.3, 0]),
  }));

  return (
    <Animated.View entering={FadeIn} style={styles.radarScreenContainer}>
      <View style={styles.radarContainer}>
        <Animated.View style={[styles.pulseRing, ringStyle]} />
        <View style={styles.radarCenter}>
          <LinearGradient colors={["#4f46e5", "#6366f1"]} style={styles.iconCircle}>
            <Users color="#fff" size={32} />
          </LinearGradient>
        </View>
      </View>

      <View style={styles.textCont}>
        <Text style={styles.statusTitle}>Finding Your Squad</Text>
        <Text style={styles.statusSub}>
          Broadcasting your job to top-rated professionals in your area...
        </Text>
      </View>

      <View style={styles.skeletonCont}>
        <GhostCard />
        <GhostCard />
      </View>

      <View style={styles.footerInfo}>
        <Radar size={16} color="#6366f1" />
        <Text style={styles.footerText}>Scanning Live Market...</Text>
      </View>
    </Animated.View>
  );
}

function GhostCard() {
  return (
    <View style={styles.ghostCard}>
      <View style={styles.ghostAvatar} />
      <View style={styles.ghostLines}>
        <View style={[styles.ghostLine, { width: "60%" }]} />
        <View style={[styles.ghostLine, { width: "40%", height: 8 }]} />
      </View>
      <View style={styles.ghostPrice} />
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  // Main Marketplace Styles
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: Platform.OS === "ios" ? 60 : 40, paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  listContent: { padding: 20, paddingBottom: 100 },
  emptyStateContainer: { alignItems: "center", justifyContent: "center", marginTop: 100, gap: 15 },
  emptyStateText: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  
  // Job Card Styles
  jobCard: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#f1f5f9", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  jobIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#eef2ff", justifyContent: "center", alignItems: "center", marginRight: 15 },
  jobTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  leadProText: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  cardDetails: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  detailPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  detailText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  payoutBox: { backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  payoutText: { fontSize: 14, fontWeight: "900", color: "#16a34a" },
  joinBtn: { backgroundColor: "#6366f1", flexDirection: "row", height: 50, borderRadius: 16, justifyContent: "center", alignItems: "center", gap: 8 },
  joinedBtn: { backgroundColor: "#94a3b8" },
  joinBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Radar Animation Styles
  radarScreenContainer: { flex: 1, backgroundColor: "#f8fafc", alignItems: "center", paddingTop: 80 },
  radarContainer: { height: 200, width: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  radarCenter: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', elevation: 10, shadowColor: '#6366f1', shadowOpacity: 0.2, shadowRadius: 15, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  pulseRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', borderWidth: 1, borderColor: '#4f46e5' },
  textCont: { alignItems: 'center', paddingHorizontal: 40, marginBottom: 40 },
  statusTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginBottom: 10 },
  statusSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  skeletonCont: { width: '100%', paddingHorizontal: 20, gap: 15 },
  ghostCard: { height: 90, backgroundColor: '#fff', borderRadius: 24, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', opacity: 0.6 },
  ghostAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#f1f5f9' },
  ghostLines: { flex: 1, marginLeft: 15, gap: 10 },
  ghostLine: { height: 12, backgroundColor: '#f1f5f9', borderRadius: 4 },
  ghostPrice: { width: 60, height: 30, backgroundColor: '#f1f5f9', borderRadius: 10 },
  footerInfo: { marginTop: 'auto', marginBottom: 40, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  footerText: { fontSize: 12, color: '#1e40af', fontWeight: '700' }
});