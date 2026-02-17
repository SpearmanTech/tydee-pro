import React, { useState, useEffect, useMemo } from "react";
import { Stack } from "expo-router";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView, 
  ScrollView, 
  Platform, 
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Zap, 
  Search,
  X,
  ChevronRight,
  Briefcase
} from "lucide-react-native";
import { db } from "@/firebase/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion, increment, serverTimestamp } from "firebase/firestore";
import Animated, { FadeInDown, SlideInBottom } from "react-native-reanimated";
import formatCurrency from "../../utils/currency";
import { useAuth } from "../../context/AuthContext";

// --- TYPES ---
type Job = {
  id: string;
  title?: string;
  category?: string;
  subService?: string;
  budget?: number;
  status?: string;
  createdAt?: any;
  displayName?: string;
  location?: { address?: string; city?: string; };
  details?: { urgency?: 'urgent' | 'standard' | 'scheduled'; description?: string; };
};

export default function Marketplace() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);
  
  // UI States
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortType, setSortType] = useState<'recent' | 'price' | 'urgency'>('recent');
  
  // Floating Card States
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync Professional Profile
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "professionals", user.uid), (snap) => {
      if (snap.exists()) setProfessionalProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid]);

  // Sync Available Gigs
  useEffect(() => {
    const q = query(collection(db, "jobs"), where("status", "in", ["pending", "open"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(jobData);
      setLoading(false);
    }, (error) => {
      console.error("Sync Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- BID SUBMISSION LOGIC ---
  const handlePlaceBid = async () => {
    if (!selectedJob || !bidAmount || !user) return;
    
    setIsSubmitting(true);
    try {
      const jobRef = doc(db, "jobs", selectedJob.id);
      
      await updateDoc(jobRef, {
        bids: arrayUnion({
          professionalId: user.uid,
          amount: Number(bidAmount),
          name: professionalProfile?.name || professionalProfile?.full_name || "Professional",
          rating: professionalProfile?.rating === "" ? 5.0 : (professionalProfile?.rating ?? 5.0), 
          profileImage: professionalProfile?.profileImage ?? "",
          timestamp: new Date().toISOString(),
          status: 'pending'
        }),
        bidders: arrayUnion(user.uid),
        bidCount: increment(1),
        hasBids: true,
        lastBidAt: serverTimestamp()
      });

      Alert.alert("Bid Placed!", "The customer has been notified of your quote.");
      setSelectedJob(null);
      setBidAmount("");
    } catch (e) {
      console.error("Bid Error:", e);
      Alert.alert("Error", "Could not submit bid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredJobs = useMemo(() => {
    let result = activeCategory === "All" ? [...jobs] : jobs.filter(j => j.category === activeCategory);
    return result.sort((a, b) => {
      if (sortType === 'price') return (b.budget || 0) - (a.budget || 0);
      if (sortType === 'urgency') {
        const weights: any = { urgent: 3, standard: 2, scheduled: 1 };
        return (weights[b.details?.urgency || 'standard'] || 0) - (weights[a.details?.urgency || 'standard'] || 0);
      }
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
  }, [jobs, activeCategory, sortType]);

  const categories = ["All", ...new Set(jobs.map(j => j.category).filter(Boolean) as string[])];

  return (
    
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Gigs</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map(cat => (
            <TouchableOpacity key={cat} style={[styles.catChip, activeCategory === cat && styles.catChipActive]} onPress={() => setActiveCategory(cat)}>
              <Text style={[styles.catChipText, activeCategory === cat && styles.catChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.sortBar}>
          <SortButton label="Newest" type="recent" current={sortType} icon={<Clock size={14} color={sortType === 'recent' ? "#4f46e5" : "#6b7280"} />} onPress={setSortType} />
          <SortButton label="Price" type="price" current={sortType} icon={<DollarSign size={14} color={sortType === 'price' ? "#4f46e5" : "#6b7280"} />} onPress={setSortType} />
          <SortButton label="Urgent" type="urgency" current={sortType} icon={<Zap size={14} color={sortType === 'urgency' ? "#4f46e5" : "#6b7280"} />} onPress={setSortType} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50)} style={styles.bookingCard}>
              
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingService}>{item.title || item.subService || "Service Request"}</Text>
                <Text style={[styles.statusBadge, styles.statusOpen]}>OPEN</Text>
              </View>

              <Text style={styles.bookingClient}>Category: {item.category || "General"}</Text>

              <View style={styles.rowSmall}>
                <MapPin size={12} color="#6b7280" />
                <Text style={styles.bookingMetaText}>{item.location?.city || "Location Pending"}</Text>
              </View>

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingPrice}>{formatCurrency(item.budget || 0)}</Text>
                
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={styles.viewBtn} 
                    onPress={() => router.push({ pathname: "/(professional)/job/[jobId]", params: { jobId: item.id } } as any)}
                  >
                    <Text style={styles.viewBtnText}>Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.startBtn} 
                    onPress={() => setSelectedJob(item)}
                  >
                    <Text style={styles.startBtnText}>Bid Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* --- FLOATING BID MODAL --- */}
      <Modal visible={!!selectedJob} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{width: '100%'}}>
            <Animated.View entering={SlideInBottom} style={styles.floatingCard}>
              <View style={styles.cardIndicator} />
              <View style={styles.floatingHeader}>
                <View style={{flex: 1}}>
                   <Text style={styles.floatingClient}>Gig Request by {selectedJob?.displayName || "Tydee Customer"}</Text>
                   <Text style={styles.floatingTitle} numberOfLines={2}>{selectedJob?.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedJob(null)} style={styles.closeBtn}>
                  <X size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoGrid}>
                <InfoItem icon={<MapPin size={16} color="#4f46e5" />} label="Location" value={selectedJob?.location?.address || selectedJob?.location?.city || "Address on acceptance"} />
                <InfoItem icon={<Briefcase size={16} color="#4f46e5" />} label="Category" value={selectedJob?.category || "General Service"} />
                <InfoItem icon={<DollarSign size={16} color="#4f46e5" />} label="Customer Budget" value={formatCurrency(selectedJob?.budget || 0)} />
              </View>

              <View style={styles.bidSection}>
                <Text style={styles.bidLabel}>Enter Your Quote (ZAR)</Text>
                <TextInput 
                  style={styles.bidInput} 
                  placeholder="0.00" 
                  keyboardType="numeric" 
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  autoFocus
                />
                <TouchableOpacity 
                  style={[styles.submitBidBtn, (!bidAmount || isSubmitting) && {opacity: 0.7}]} 
                  onPress={handlePlaceBid} 
                  disabled={!bidAmount || isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.submitBidText}>Send My Quote</Text>
                      <ChevronRight size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* --- SUB-COMPONENTS --- */
function SortButton({ label, type, current, icon, onPress }: any) {
  return (
    <TouchableOpacity style={styles.sortBtn} onPress={() => onPress(type)}>
      {icon}
      <Text style={[styles.sortText, current === type && styles.activeSort]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoItem({ icon, label, value }: any) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIconWrap}>{icon}</View>
      <View style={{flex: 1}}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Search size={40} color="#d1d5db" />
      <Text style={styles.emptySub}>No jobs available right now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  backBtn: { padding: 5 },
  filterSection: { paddingVertical: 10, backgroundColor: "#fff" },
  catScroll: { paddingHorizontal: 20, gap: 10, marginBottom: 10 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f3f4f6" },
  catChipActive: { backgroundColor: "#111827" },
  catChipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  catChipTextActive: { color: "#fff" },
  sortBar: { flexDirection: "row", paddingHorizontal: 20, gap: 15, marginTop: 5 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  sortText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  activeSort: { color: "#4f46e5" },
  listContent: { padding: 20, paddingBottom: 100 },
  
  // --- UNIFIED CARD STYLES ---
  bookingCard: { 
    backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 16, 
    borderWidth: 1, borderColor: "#e5e7eb", elevation: 2, 
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 
  },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  bookingService: { fontSize: 16, fontWeight: "800", color: "#111827", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 10, fontWeight: "800", overflow: "hidden" },
  statusOpen: { backgroundColor: "#ecfdf5", color: "#059669" },
  bookingClient: { fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 6 },
  rowSmall: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  bookingMetaText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  bookingFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 15 },
  bookingPrice: { fontSize: 20, fontWeight: "900", color: "#059669" },
  actionsRow: { flexDirection: "row", gap: 8 },
  viewBtn: { backgroundColor: "#f3f4f6", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  viewBtnText: { color: "#374151", fontSize: 12, fontWeight: "700" },
  startBtn: { backgroundColor: "#111827", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  startBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // --- MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  floatingCard: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  cardIndicator: { width: 40, height: 5, backgroundColor: '#e5e7eb', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  floatingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  floatingClient: { fontSize: 13, color: '#4f46e5', fontWeight: '700', marginBottom: 4 },
  floatingTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  closeBtn: { padding: 4 },
  infoGrid: { gap: 16, marginBottom: 30 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  bidSection: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 20 },
  bidLabel: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 },
  bidInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 18, fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20, textAlign: 'center' },
  submitBidBtn: { backgroundColor: '#4f46e5', height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  submitBidText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptySub: { fontSize: 14, color: "#6b7280", marginTop: 10 },
});