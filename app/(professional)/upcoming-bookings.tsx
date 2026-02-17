import React, { useState, useEffect, useMemo } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Platform, StatusBar, Modal, ScrollView 
} from "react-native";
import { useRouter } from "expo-router";
import { 
  Calendar, Clock, MapPin, X, AlertTriangle, 
  ArrowLeft, ChevronRight, Timer, 
  Filter
} from "lucide-react-native";
import { db, auth } from "@/firebase/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import Animated, { FadeInDown, SlideInBottom, SlideOutBottom } from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';

type Booking = {
  id: string; service: string; client: string; scheduled_date: string;
  property_address: string; price: number; status: string; category: string;
  urgency: 'urgent' | 'standard' | 'scheduled'; bidAcceptedAt: any;
};

const formatZAR = (value: number) => `R ${Number(value || 0).toFixed(2)}`;

export default function UpcomingBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const getTimeLeft = (acceptedAt: any, urgency: string) => {
    if (!acceptedAt) return null;
    const limitMap: Record<string, number> = { urgent: 4, standard: 12, scheduled: 4 };
    const limit = limitMap[urgency] || 4;
    const acceptedDate = acceptedAt.toDate ? acceptedAt.toDate() : new Date(acceptedAt);
    const expiry = new Date(acceptedDate.getTime() + limit * 60 * 60 * 1000);
    const diff = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return diff > 0 ? diff.toFixed(1) : "0";
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "jobs"),
      where("assigned_professional_id", "==", user.uid),
      where("status", "in", ["confirmed", "accepted", "pending"]),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          service: d.title || d.subService || "Service", 
          client: d.customerName || "Customer",
          scheduled_date: d.details?.scheduledDate || new Date().toISOString(),
          property_address: d.location?.address || "No address",
          price: d.budget || 0,
          status: d.status || "confirmed",
          category: d.category || "General",
          urgency: d.details?.urgency || 'standard',
          bidAcceptedAt: d.bidAcceptedAt 
        };
      }) as Booking[];
      setBookings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeFilter === "All") return bookings;
    return bookings.filter(b => b.category === activeFilter);
  }, [bookings, activeFilter]);

  const serviceTypes = ["All", ...new Set(bookings.map(b => b.category))];

  const renderBooking = ({ item, index }: { item: Booking, index: number }) => {
    const timeLeft = getTimeLeft(item.bidAcceptedAt, item.urgency);
    const isUrgent = timeLeft && parseFloat(timeLeft) < 2;

    return (
      <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.cardWrapper}>
        <TouchableOpacity style={styles.card} onPress={() => setSelectedBooking(item)} activeOpacity={0.9}>
          <View style={styles.cardHeader}>
            <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{new Date(item.scheduled_date).getDate()}</Text>
                <Text style={styles.dateMonth}>
                    {new Date(item.scheduled_date).toLocaleString('default', { month: 'short' }).toUpperCase()}
                </Text>
            </View>
            <View style={styles.mainInfo}>
                <Text style={styles.serviceText}>{item.service}</Text>
                <View style={styles.metaRow}>
                    <MapPin size={12} color="#94a3b8" />
                    <Text style={styles.metaText} numberOfLines={1}>{item.property_address}</Text>
                </View>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </View>

          <View style={styles.cardFooter}>
             <View style={styles.footerLeft}>
                <View style={styles.clientInitial}>
                    <Text style={styles.initialText}>{item.client.charAt(0)}</Text>
                </View>
                <Text style={styles.clientName}>{item.client}</Text>
             </View>
             
             {timeLeft !== null && (
                <View style={[styles.timerBadge, isUrgent && styles.timerUrgent]}>
                    <Timer size={12} color={isUrgent ? "#fff" : "#ef4444"} />
                    <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>{timeLeft}h</Text>
                </View>
             )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Schedule</Text>
        <TouchableOpacity style={styles.headerIcon}>
           <Filter size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {serviceTypes.map((type) => (
            <TouchableOpacity 
                key={type} 
                style={[styles.filterChip, activeFilter === type && styles.filterActive]}
                onPress={() => setActiveFilter(type)}
            >
                <Text style={[styles.filterText, activeFilter === type && styles.filterTextActive]}>{type}</Text>
            </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <View style={styles.emptyCircle}><Calendar size={32} color="#cbd5e1" /></View>
                <Text style={styles.emptyTitle}>Clear Schedule</Text>
                <Text style={styles.emptySub}>No upcoming assignments. Check the Marketplace to bid on new jobs.</Text>
            </View>
          }
        />
      )}

      {/* DETAIL DRAWER */}
      <Modal visible={!!selectedBooking} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismiss} onPress={() => setSelectedBooking(null)} />
            <Animated.View entering={SlideInBottom} style={styles.drawer}>
                <View style={styles.drawerHandle} />
                <View style={styles.drawerHeader}>
                    <View style={styles.alertIcon}><AlertTriangle size={24} color="#f59e0b" /></View>
                    <View>
                        <Text style={styles.drawerTitle}>Action Required</Text>
                        <Text style={styles.drawerSub}>Start process before deadline</Text>
                    </View>
                </View>
                
                <View style={styles.drawerBody}>
                    <Text style={styles.drawerService}>{selectedBooking?.service}</Text>
                    <Text style={styles.drawerWarning}>
                        This job must be started within <Text style={styles.bold}>{getTimeLeft(selectedBooking?.bidAcceptedAt, selectedBooking?.urgency || 'standard')} hours</Text> or it will be returned to the open marketplace.
                    </Text>
                </View>

                <TouchableOpacity 
                    style={styles.primaryBtn}
                    onPress={() => {
                        setSelectedBooking(null);
                        router.push({ pathname: "/(professional)/job/[jobId]", params: { jobId: selectedBooking?.id } } as any);
                    }}
                >
                    <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.btnGradient}>
                        <Text style={styles.btnText}>Proceed to Job Details</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  
  filterWrapper: { backgroundColor: '#fff', paddingBottom: 15 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: '#f1f5f9' },
  filterActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  filterTextActive: { color: '#fff' },

  listContent: { padding: 20, paddingBottom: 100 },
  cardWrapper: { marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  dateBox: { width: 50, height: 55, backgroundColor: '#f5f3ff', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 20, fontWeight: '900', color: '#4338ca' },
  dateMonth: { fontSize: 10, fontWeight: '800', color: '#6366f1' },
  mainInfo: { flex: 1 },
  serviceText: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clientInitial: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  initialText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  clientName: { fontSize: 13, fontWeight: '600', color: '#475569' },
  
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  timerUrgent: { backgroundColor: '#ef4444' },
  timerText: { fontSize: 11, fontWeight: '800', color: '#ef4444' },
  timerTextUrgent: { color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  drawer: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, paddingBottom: 50 },
  drawerHandle: { width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 25 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  alertIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center' },
  drawerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  drawerSub: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  drawerService: { fontSize: 17, fontWeight: '800', color: '#6366f1', marginBottom: 12 },
  drawerWarning: { fontSize: 14, color: '#64748b', lineHeight: 22, fontWeight: '500' },
  bold: { fontWeight: '900', color: '#1e293b' },
  primaryBtn: { marginTop: 30, borderRadius: 20, overflow: 'hidden' },
  btnGradient: { paddingVertical: 20, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  emptyState: { alignItems: 'center', marginTop: 60, padding: 40, backgroundColor: '#fff', borderRadius: 32, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  emptyCircle: { width: 64, height: 64, borderRadius: 24, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});