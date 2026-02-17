import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Star, MessageSquare, TrendingUp, Filter, ArrowLeft, Award, Quote } from "lucide-react-native";
import { db, auth } from "@/firebase/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

type Review = {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
  serviceName: string;
  createdAt: any;
};

export default function ProfessionalRatings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ avg: 0, total: 0 });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "jobs"),
      where("assigned_professional_id", "==", user.uid),
      where("status", "==", "completed"),
      where("rating", ">", 0),
      orderBy("rating", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        rating: doc.data().rating,
        comment: doc.data().reviewComment || "Excellent service provided.",
        customerName: doc.data().customerName || "Verified User",
        serviceName: doc.data().service || "General Service",
        createdAt: doc.data().completedAt
      })) as Review[];
      
      const total = data.length;
      const avg = total > 0 ? data.reduce((acc, curr) => acc + curr.rating, 0) / total : 0;
      
      setStats({ avg, total });
      setReviews(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderStars = (count: number, size = 12) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star 
          key={s} 
          size={size} 
          fill={s <= count ? "#f59e0b" : "transparent"} 
          color={s <= count ? "#f59e0b" : "#e2e8f0"} 
        />
      ))}
    </View>
  );

  const renderReview = ({ item, index }: { item: Review, index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100)} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.initialCircle}>
            <Text style={styles.initialText}>{item.customerName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.serviceTag}>{item.serviceName}</Text>
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : "Recent"}
        </Text>
      </View>
      
      <View style={styles.reviewContent}>
        {renderStars(item.rating, 14)}
        <View style={styles.commentContainer}>
          <Quote size={14} color="#e2e8f0" style={styles.quoteIcon} />
          <Text style={styles.commentText}>{item.comment}</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reputation</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Filter size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* REFRESHED SUMMARY HERO */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.summaryHero}>
        <View style={styles.scoreCircle}>
            <Text style={styles.avgScore}>{stats.avg.toFixed(1)}</Text>
            {renderStars(Math.round(stats.avg), 16)}
        </View>
        
        <View style={styles.statsPanel}>
            <View style={styles.statItem}>
                <Award size={18} color="#10b981" />
                <Text style={styles.statLabel}>PRO STATUS</Text>
                <Text style={styles.statValue}>Top 5%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
                <MessageSquare size={18} color="#6366f1" />
                <Text style={styles.statLabel}>REVIEWS</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
            </View>
        </View>
      </Animated.View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Customer Feedback</Text>
        <TrendingUp size={16} color="#94a3b8" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReview}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <MessageSquare size={32} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No feedback yet</Text>
              <Text style={styles.emptySub}>Your verified reviews will appear here after you complete jobs.</Text>
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
  
  summaryHero: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 32,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  avgScore: { fontSize: 36, fontWeight: "900", color: "#1e293b", marginBottom: 2 },
  
  statsPanel: { flex: 1, flexDirection: 'row', marginLeft: 20, justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: "800", color: "#94a3b8", marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
  statDivider: { width: 1, height: 40, backgroundColor: "#f1f5f9" },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 15, alignItems: 'center' },
  listTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 1,
  },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: 'flex-start', marginBottom: 16 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  initialCircle: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  initialText: { fontSize: 16, fontWeight: '800', color: '#6366f1' },
  customerName: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  serviceTag: { fontSize: 11, color: "#6366f1", fontWeight: "700", marginTop: 2 },
  reviewDate: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  
  reviewContent: { gap: 10 },
  commentContainer: { flexDirection: 'row', gap: 8 },
  quoteIcon: { marginTop: 2 },
  commentText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 22, fontWeight: "500" },
  starRow: { flexDirection: "row", gap: 2 },

  emptyState: { alignItems: "center", marginTop: 40, backgroundColor: '#fff', padding: 40, borderRadius: 32, borderStyle: 'dashed', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 24, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 8, lineHeight: 20 },
});