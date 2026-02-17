import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ListChecks,
  BadgePercent,
  ArrowLeft,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { db, auth } from "@/firebase/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const COMMISSION_RATE = 0.10;

const formatZAR = (value: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(value);
};

export default function EarningsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'year'>('weekly');
  const [realTransactions, setRealTransactions] = useState<any[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "jobs"),
      where("assigned_professional_id", "==", user.uid),
      where("status", "==", "completed")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().completedAt?.toDate() || doc.data().createdAt?.toDate() || new Date()
      }));
      setRealTransactions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const { selectedData, trendString, trendPositive } = useMemo(() => {
    const now = new Date();
    const currentFiltered = realTransactions.filter(t => {
      if (timeframe === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return t.date >= weekAgo;
      }
      if (timeframe === 'monthly') {
        return t.date.getMonth() === now.getMonth() && t.date.getFullYear() === now.getFullYear();
      }
      return t.date.getFullYear() === now.getFullYear();
    });

    const currentGross = currentFiltered.reduce((sum, t) => sum + (t.final_price || t.budget || 0), 0);
    const currentCommission = currentGross * COMMISSION_RATE;
    const currentNet = currentGross - currentCommission;

    let previousFiltered: any[] = [];

    if (timeframe === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      previousFiltered = realTransactions.filter(t => t.date >= prevWeekStart && t.date < weekAgo);
    } else if (timeframe === 'monthly') {
      let prevMonth = now.getMonth() - 1;
      let prevYear = now.getFullYear();
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }
      previousFiltered = realTransactions.filter(t => t.date.getMonth() === prevMonth && t.date.getFullYear() === prevYear);
    } else { // year
      const prevYear = now.getFullYear() - 1;
      previousFiltered = realTransactions.filter(t => t.date.getFullYear() === prevYear);
    }

    const previousGross = previousFiltered.reduce((sum, t) => sum + (t.final_price || t.budget || 0), 0);
    const previousCommission = previousGross * COMMISSION_RATE;
    const previousNet = previousGross - previousCommission;

    let trend = 0;
    if (previousNet > 0) {
      trend = ((currentNet - previousNet) / previousNet) * 100;
    } else if (currentNet > 0) {
      trend = 100; // Arbitrary for new growth
    }

    const trendString = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}% vs last period`;
    const trendPositive = trend >= 0;

    return {
      selectedData: {
        total: currentGross,
        jobs: currentFiltered.length,
        commission: currentCommission,
        net: currentNet,
      },
      trendString,
      trendPositive,
    };
  }, [realTransactions, timeframe]);

  if (loading) return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Analyzing your success...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings & Insights</Text>
        <TouchableOpacity style={styles.headerIcon}>
            <TrendingUp size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
       
        {/* REFINED TIMEFRAME SELECTOR */}
        <View style={styles.selectorWrapper}>
          <View style={styles.timeframeSelector}>
            <TimeframeButton label="Week" value="weekly" current={timeframe} onPress={setTimeframe} />
            <TimeframeButton label="Month" value="monthly" current={timeframe} onPress={setTimeframe} />
            <TimeframeButton label="Year" value="year" current={timeframe} onPress={setTimeframe} />
          </View>
        </View>

        {/* MAIN EARNINGS CARD */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={['#1e1b4b', '#4338ca']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainCard}
          >
            <View style={styles.cardHeader}>
                <Text style={styles.mainCardTitle}>NET PAYOUT</Text>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>
            <Text style={styles.netValue}>{formatZAR(selectedData.net)}</Text>
           
            <View style={styles.cardFooter}>
                <View style={styles.trendRow}>
                    {trendPositive ? (
                      <ArrowUpRight size={14} color="#10b981" strokeWidth={3} />
                    ) : (
                      <ArrowDownRight size={14} color="#ef4444" strokeWidth={3} />
                    )}
                    <Text style={[styles.trendText, { color: trendPositive ? '#10b981' : '#ef4444' }]}>{trendString}</Text>
                </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* METRICS ROW */}
        <View style={styles.metricsRow}>
          <MetricCard icon={<DollarSign size={18} color="#10b981" />} title="Gross" value={formatZAR(selectedData.total)} />
          <MetricCard icon={<ListChecks size={18} color="#6366f1" />} title="Jobs" value={`${selectedData.jobs}`} />
          <MetricCard icon={<BadgePercent size={18} color="#ef4444" />} title="Tydee Fee" value={formatZAR(selectedData.commission)} />
        </View>

        {/* RECENT TRANSACTIONS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payouts</Text>
            <TouchableOpacity>
                <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {realTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
                <Receipt size={40} color="#cbd5e1" style={{marginBottom: 12}} />
                <Text style={styles.emptyTitle}>No earnings recorded</Text>
                <Text style={styles.emptySub}>Your payouts will appear here once jobs are completed.</Text>
            </View>
          ) : (
            realTransactions.slice(0, 8).map((t, i) => (
              <Animated.View entering={FadeInRight.delay(i * 100)} key={t.id}>
                <TouchableOpacity style={styles.transactionRow}>
                  <View style={styles.transactionIcon}>
                    <Receipt width={20} height={20} color="#6366f1" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>{t.title || t.service || "Service Rendered"}</Text>
                    <Text style={styles.transactionDate}>
                        {t.date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.amountArea}>
                    <Text style={styles.transactionAmount}>{formatZAR(t.final_price || t.budget)}</Text>
                    <ChevronRight size={14} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* --- PREMIUM SUB-COMPONENTS --- */

function TimeframeButton({ label, value, current, onPress }: any) {
  const isActive = current === value;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.timeframeButton, isActive && styles.timeframeButtonActive]}
      onPress={() => onPress(value)}
    >
      <Text style={[styles.timeframeText, isActive && styles.timeframeTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MetricCard({ icon, title, value }: any) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
        borderRadius: 22,
        backgroundColor: "#f1f5f9",
        justifyContent: "center",
        alignItems: "center",
    },
    headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '700' },
    
    selectorWrapper: { alignItems: 'center', marginVertical: 25 },
    timeframeSelector: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        padding: 6,
        width: '100%',
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    timeframeButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    timeframeButtonActive: {
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10
    },
    timeframeText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
    timeframeTextActive: { color: '#1e293b', fontWeight: '800' },
    
    mainCard: {
        borderRadius: 32,
        padding: 30,
        marginBottom: 25,
        elevation: 12,
        shadowColor: '#1e1b4b',
        shadowOpacity: 0.3,
        shadowRadius: 20
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    mainCardTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
    liveText: { color: '#10b981', fontSize: 10, fontWeight: '900' },
    netValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginTop: 10 },
    cardFooter: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    trendRow: { flexDirection: 'row', alignItems: 'center' },
    trendText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#10b981' },
    
    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 30 },
    metricCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 10
    },
    iconWrap: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 14, marginBottom: 12 },
    metricValue: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    metricTitle: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
    
    section: { marginBottom: 30 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    seeAllText: { color: '#6366f1', fontSize: 13, fontWeight: '700' },
    
    emptyCard: { backgroundColor: '#fff', padding: 40, borderRadius: 32, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', borderStyle: 'dashed' },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 8, textAlign: 'center', lineHeight: 20 },
    
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 18,
        marginBottom: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        elevation: 1
    },
    transactionIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    transactionDetails: { flex: 1 },
    transactionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    transactionDate: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
    amountArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    transactionAmount: { fontWeight: '900', fontSize: 15, color: '#10b981' },
});