import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, StatusBar, ActivityIndicator, Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from "../../../context/AuthContext";
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const STATUS_TABS = ['Active', 'Pending', 'Past'];

export default function ProfessionalRentalsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Active');
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 REAL-TIME SYNC
  useEffect(() => {
    if (!user) return;

    const rentalsRef = collection(db, 'rentals');
    const q = query(
      rentalsRef, 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rentalData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRentals(rentalData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredRentals = rentals.filter(r => {
    if (activeTab === 'Active') return r.status === 'confirmed' || r.status === 'in-progress';
    if (activeTab === 'Pending') return r.status === 'pending';
    if (activeTab === 'Past') return r.status === 'completed' || r.status === 'cancelled';
    return true;
  });

  const renderRentalCard = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.rentalCard}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.equipmentTitle || 'Equipment'}</Text>
          <Text style={styles.jobText}>Job: {item.metadata?.location || 'General Site'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.footerValue}>{item.days} Days</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="wallet-outline" size={14} color="#64748b" />
          <Text style={styles.footerValue}>R{item.totalAmount}</Text>
        </View>
        <TouchableOpacity style={styles.manageBtn}>
           <Text style={styles.manageBtnText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header & Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gear Inventory</Text>
        <TouchableOpacity style={styles.historyBtn}>
           <Ionicons name="receipt-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatBox label="Active" value={rentals.filter(r => r.status === 'confirmed').length} color="#6366f1" />
        <StatBox label="Due Soon" value={0} color="#f59e0b" />
        <StatBox label="Spending" value={`R${rentals.reduce((acc, r) => acc + (r.totalAmount || 0), 0)}`} color="#10b981" isLarge />
      </View>

      {/* Status Tabs */}
      <View style={styles.tabBar}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab);
            }}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredRentals}
          renderItem={renderRentalCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} rentals found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const StatBox = ({ label, value, color, isLarge }: any) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }, isLarge && { fontSize: 16 }]}>{value}</Text>
  </View>
);

const getStatusColor = (status: string) => {
  switch(status) {
    case 'confirmed': return '#10b981';
    case 'pending': return '#f59e0b';
    case 'cancelled': return '#ef4444';
    default: return '#64748b';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  historyBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '900' },

  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
  activeTab: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: 'white' },

  list: { padding: 20 },
  rentalCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  jobText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900', color: 'white' },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20, gap: 6 },
  footerValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  manageBtn: { marginLeft: 'auto', backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  manageBtnText: { fontSize: 12, fontWeight: '800', color: '#6366f1' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontWeight: '600' }
});