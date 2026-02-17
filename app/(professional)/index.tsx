import React, { useEffect, useMemo, useState } from "react";
import { subServiceConfigs } from "../../constants/subServiceConfigs";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  GestureResponderEvent
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "@/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  getDoc
} from "firebase/firestore";
import Animated, { FadeInDown } from "react-native-reanimated";
import { 
  Menu, Zap, DollarSign, CheckCircle, Star, Calendar, 
  MapPin, Clock, HandshakeIcon, Clock10Icon, ToggleRight, 
  ToggleLeft, X, ShieldCheck, Briefcase
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import ProfileSettingsDrawer from "./ProfileSettingsDrawer";

// Types
type Booking = {
  propertyDetails: any;
  id: string; service?: string; customerName?: string; description?: string;
  status?: string; property_address?: string; address?: string; price?: number;
  budget?: number; createdAt?: any; scheduledAt?: any; location?: { city?: string; address?: string };
  startPin?: string; bids?: any[]; bidders?: string[]; title?: string; displayName?: string; subService?: string;
  customerInitialBid?: number;
};

type ProfessionalProfile = {
  name: string; rating: number; profileImage?: string; isOnline: boolean;
  isVerified?: boolean; isCleared?: boolean;
};

const formatZAR = (value: number) => `R ${Number(value || 0).toFixed(2)}`;

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [professional, setProfessional] = useState<ProfessionalProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(user?.uid || null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Modal States
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [selectedJobForBid, setSelectedJobForBid] = useState<Booking | null>(null);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const canPerformWork = () => professional?.isVerified === true && isOnline === true;
  
  const renderJobSpecifics = () => {
  if (!selectedJobForBid?.propertyDetails || !selectedJobForBid?.subService) return null;

  const config = subServiceConfigs[selectedJobForBid.subService];
  if (!config) return null;

  return config.map((field) => {
    const value = selectedJobForBid.propertyDetails[field.key];
    
    // Only render if the value exists/is not null
    if (value === undefined || value === null || value === false) return null;

    // Format the display: convert booleans to 'Yes' and add units if needed
    let displayValue = value;
    if (typeof value === 'boolean') displayValue = 'Yes';
    
    return (
      <View key={field.key} style={styles.specRow}>
        <Text style={styles.specLabel}>{field.label}</Text>
        <Text style={styles.specValue}>{displayValue}</Text>
      </View>
    );
  });
};
  // Listen for Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setUserId(u.uid);
    });
    return () => unsubAuth();
  }, []);

  // Listen for Profile
  useEffect(() => {
    if (!userId) return;
    return onSnapshot(doc(db, "professionals", userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ProfessionalProfile;
        setProfessional(data);
        setIsOnline(data.isOnline);
      }
      setIsLoading(false);
    });
  }, [userId]);

  // Listen for Assigned Jobs
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "jobs"), where("assigned_professional_id", "==", userId));
    return onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking));
    });
  }, [userId]);

  // Listen for Marketplace (Status: open)
  useEffect(() => {
  // Use a simple query first to confirm data is flowing
  const qOpen = query(
    collection(db, "jobs"), 
    where("status", "==", "pending") // Pull everything that isn't assigned yet
  );

  const unsubscribe = onSnapshot(qOpen, (snap) => {
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Manual filtering (faster than waiting for index propagation)
    const filtered = jobs.filter(j => j.customerId !== user?.uid); 
    
    setAvailableJobs(filtered);
    setIsLoading(false);
  }, (error) => {
    console.error("Firestore Error:", error);
    Alert.alert("Connection Error", "Could not load marketplace.");
  });

  return () => unsubscribe();
}, [user?.uid]);
  const handleToggleOnline = async () => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, "professionals", userId), { isOnline: !isOnline, updatedAt: serverTimestamp() });
    } catch (error) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

const verifyAndStartJob = async () => {
  if (!selectedBooking?.id || enteredPin.length < 4) return;
  
  setIsVerifying(true);
  try {
    const jobRef = doc(db, "jobs", selectedBooking.id);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) {
      Alert.alert("Error", "Job data missing from server.");
      return;
    }

    const latestJobData = jobSnap.data();
    
    // --- LOUD DEBUGGING ---
    // This will print to your console. Watch for "" vs "7499"
    const serverPin = String(latestJobData.startPin || "").trim();
    const inputPin = String(enteredPin).trim();
    
    console.log("--- HANDSHAKE ATTEMPT ---");
    console.log("Job ID:", selectedBooking.id);
    console.log("Stored PIN on Server:", `"${serverPin}"`);
    console.log("Your Input PIN:", `"${inputPin}"`);

    if (inputPin !== serverPin) {
      // Temporary: Show the server pin in the alert for debugging only
      Alert.alert("Invalid PIN", `Input "${inputPin}" does not match server.`);
      return;
    }

    // Success: Update to 'in_progress' to trigger the timer
    await updateDoc(jobRef, { 
      status: "in_progress", 
      jobStartedAt: serverTimestamp() 
    });

    setPinModalVisible(false);
    setEnteredPin("");
    
    router.push({ 
      pathname: "/(professional)/activeJobdetails", 
      params: { jobId: selectedBooking.id } 
    } as any);

  } catch (e) {
    console.error("Handshake System Error:", e);
    Alert.alert("Error", "Handshake failed. Check your connection.");
  } finally {
    setIsVerifying(false);
  }
};

  const metrics = useMemo(() => ({
    totalEarnings: bookings.filter(b => b.status === "completed").reduce((s, b) => s + Number(b.price || b.budget || 0), 0),
    jobsCompleted: bookings.filter(b => b.status === "completed").length,
    avgRating: professional?.rating || 0,
    upcomingJobs: bookings.filter(b => ["confirmed", "accepted", "assigned", "in_progress"].includes(b.status || "")).length,
    historyCount: bookings.filter(b => b.status === "completed").length,
  }), [bookings, professional]);

  if (isLoading) return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color="#4f46e5" /></View>;

  const submitBid = async () => {
  if (!selectedJobForBid || !bidAmount || isSubmittingBid) return;

  const amount = parseFloat(bidAmount);
  if (isNaN(amount) || amount <= 0) {
    Alert.alert("Invalid Amount", "Please enter a valid price.");
    return;
  }

  setIsSubmittingBid(true);

  try {
    // 1. Initialize the function reference
    const functions = getFunctions();
    const submitBidFunction = httpsCallable(functions, 'submitBid');

    // 2. Call the function with the data your backend expects
    const result = await submitBidFunction({
      jobId: selectedJobForBid.id,
      amount: amount
    });

    // 3. Handle success
    if (result.data) {
      setBidModalVisible(false);
      setSelectedJobForBid(null);
      setBidAmount("");
      Alert.alert("Success", "Your bid has been submitted to the marketplace!");
    }
  } catch (error: any) {
    console.error("Cloud Function Error:", error);
    // This will catch the HttpsErrors you defined in your backend (e.g., "unauthenticated")
    Alert.alert("Bid Failed", error.message || "Failed to submit bid.");
  } finally {
    setIsSubmittingBid(false);
  }
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => setProfileDrawerOpen(true)}>
          <Menu width={20} height={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.userName}>{professional?.name?.split(" ")[0] || "Partner"}</Text>
        </View>
        <Image source={{ uri: professional?.profileImage || "https://via.placeholder.com/100" }} style={styles.avatar} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ONLINE STATUS */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient colors={['#1e1b4b', '#4338ca']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.premiumCard}>
            <View>
              <Text style={styles.statusTitle}>Visibility Status</Text>
              <Text style={[styles.statusSub, isOnline ? styles.textOnline : styles.textOffline]}>
                {isOnline ? "Receiving Job Invites" : "Appearance Hidden"}
              </Text>
            </View>
            <TouchableOpacity onPress={handleToggleOnline}>
              {isOnline ? <ToggleRight size={44} color="#10b981" /> : <ToggleLeft size={44} color="rgba(255,255,255,0.2)" />}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* METRICS */}
        <View style={styles.gridContainer}>
          <NavCard icon={<DollarSign color="#10b981" />} label="Earnings" value={formatZAR(metrics.totalEarnings)} onPress={() => router.push("/earnings")} />
          <NavCard icon={<CheckCircle color="#6366f1" />} label="Completed" value={metrics.jobsCompleted} onPress={() => router.push("/completed-jobs")} />
          <NavCard icon={<Star color="#f59e0b" />} label="Rating" value={metrics.avgRating.toFixed(1)} onPress={() => router.push("/ratings")} />
          <NavCard icon={<HandshakeIcon color="#0ea5e9" />} label="Collabs" value="0" onPress={() => router.push("/collaborations/collaborations")} />
          <NavCard icon={<Calendar color="#ec4899" />} label="Upcoming" value={metrics.upcomingJobs} onPress={() => router.push("/upcoming-bookings")} />
          <NavCard icon={<Clock10Icon color="#64748b" />} label="History" value={metrics.historyCount} onPress={() => router.push("/past-bookings")} />
        </View>

        {/* ACTIVE ASSIGNMENTS */}
        <Text style={styles.sectionTitle}>Active Assignments</Text>
        {bookings.filter(b => b.status !== "completed").length === 0 ? (
          <Text style={styles.emptyText}>No active jobs today</Text>
        ) : (
          bookings.filter(b => b.status !== "completed").slice(0, 3).map((b) => (
            <View key={b.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobService}>{b.title || b.service}</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{b.status?.replace('_', ' ')}</Text></View>
              </View>
              <View style={styles.locationRow}>
                <MapPin size={12} color="#94a3b8" />
                <Text style={styles.locationText} numberOfLines={1}>{b.location?.address || b.property_address}</Text>
              </View>
              <View style={styles.jobFooter}>
                <Text style={styles.jobPrice}>{formatZAR(b.price || b.budget || 0)}</Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.subBtn} onPress={() => router.push({ pathname: "/(professional)/activeJobdetails", params: { jobId: b.id } } as any)}><Text style={styles.subBtnText}>View</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.mainBtn} onPress={() => { setSelectedBooking(b); setBannerVisible(true); }} disabled={b.status === "in_progress"}><Text style={styles.mainBtnText}>{b.status === "in_progress" ? "Ongoing" : "Start"}</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* MARKETPLACE SECTION */}
        <Text style={styles.sectionTitle}>Marketplace Opportunities</Text>
        {availableJobs.slice(0, 15).map((job) => {
          const hasAlreadyBid = job.bidders?.includes(user?.uid || "");
          return (
            <TouchableOpacity 
              key={job.id} 
              style={[styles.marketCard, hasAlreadyBid && styles.alreadyBidCard]} 
              onPress={() => {
                setSelectedJobForBid(job);
                if (hasAlreadyBid) {
                  const myBid = job.bids?.find(b => b.proId === user?.uid);
                  setBidAmount(myBid ? String(myBid.amount) : "");
                } else {
                  setBidAmount("");
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.marketTitle, hasAlreadyBid && { color: "#fff" }]}>{job.title || job.subService}</Text>
                <View style={[styles.scheduledBadge, hasAlreadyBid && { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Calendar size={10} color={hasAlreadyBid ? "#fff" : "#6366f1"} />
                  <Text style={[styles.scheduledText, hasAlreadyBid && { color: "#fff" }]}>
                    {job.scheduledAt 
                      ? new Date(job.scheduledAt.seconds * 1000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : "ASAP"}
                  </Text>
                </View>
                <Text style={[styles.marketMeta, hasAlreadyBid && { color: "rgba(255,255,255,0.7)" }]}>{job.location?.city || "Durban"}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={[styles.marketPrice, hasAlreadyBid && { color: "#fff" }]}>{formatZAR(job.budget || job.customerInitialBid || 0)}</Text>
                <Text style={[styles.bidNowText, hasAlreadyBid && styles.updateBidText]}>{hasAlreadyBid ? "Update Quote" : "Bid Now"}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* JOB INFO MODAL */}
      <Modal visible={!!selectedJobForBid && !bidModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.premiumModal}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedJobForBid(null)}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={styles.modalHeading}>Job Requirements</Text>
            <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inDepthContainer}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{selectedJobForBid?.subService || selectedJobForBid?.title}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Client Name</Text>
                  <Text style={styles.detailValue}>{selectedJobForBid?.displayName || "Tydee User"}</Text>
                </View>
                <View style={styles.detailSection}>
  <Text style={styles.detailLabel}>Specific Requirements</Text>
  <View style={styles.specsContainer}>
    {renderJobSpecifics()}
    {/* Fallback if no specific configs are found */}
    {!renderJobSpecifics() && (
      <Text style={styles.requirementText}>Standard service requirements apply.</Text>
    )}
  </View>
</View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.infoRowLabel}>Target Budget</Text>
                  <Text style={styles.infoRowValue}>{formatZAR(selectedJobForBid?.budget || selectedJobForBid?.customerInitialBid || 0)}</Text>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSelectedJobForBid(null)}><Text style={styles.cancelText}>Dismiss</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={() => { if(!canPerformWork()) return Alert.alert("Restricted", "Be Online/Verified to bid."); setBidModalVisible(true); }}>
                <Text style={styles.submitText}>Continue to Bid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BID INPUT MODAL */}
      <Modal visible={bidModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.premiumModal}>
            <Text style={styles.modalHeading}>Your Quote</Text>
            <TextInput placeholder="ZAR Amount" keyboardType="numeric" value={bidAmount} onChangeText={setBidAmount} style={styles.modalInput} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setBidModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitBid} disabled={isSubmittingBid}>
                {isSubmittingBid ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Bid</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SafetyBanner visible={bannerVisible} onConfirm={() => { setBannerVisible(false); setTimeout(() => setPinModalVisible(true), 400); }} onCancel={() => setBannerVisible(false)} />
      <HandshakeModal visible={pinModalVisible} pin={enteredPin} setPin={setEnteredPin} onVerify={verifyAndStartJob} onCancel={() => setPinModalVisible(false)} loading={isVerifying} />
      <ProfileSettingsDrawer visible={profileDrawerOpen} onClose={() => setProfileDrawerOpen(false)} />
    </View>
  );
}

// Sub-components
function NavCard({ icon, label, value, onPress }: any) {
  return (
    <TouchableOpacity style={styles.navCard} onPress={onPress}>
      <View style={styles.navIconContainer}>{icon}</View>
      <Text style={styles.navValue}>{value}</Text>
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SafetyBanner({ visible, onConfirm, onCancel }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeInDown.springify()} style={styles.safetyCard}>
          <View style={styles.safetyHeader}><ShieldCheck size={28} color="#10b981" /><Text style={styles.safetyTitle}>Safety Protocol</Text></View>
          <Text style={styles.safetyText}>• Uniform visible{"\n"}• Safety gear ready{"\n"}• Surroundings secure</Text>
          <View style={styles.safetyActions}>
            <TouchableOpacity onPress={onCancel}><Text style={styles.cancelLinkText}>Not yet</Text></TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}><Text style={styles.confirmBtnText}>Confirm</Text></TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function HandshakeModal({ visible, onVerify, onCancel, pin, setPin, loading }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.premiumModal}>
          <View style={{flexDirection:'row', justifyContent:'space-between'}}><Text style={styles.modalHeading}>Job Code</Text><TouchableOpacity onPress={onCancel}><X size={20}/></TouchableOpacity></View>
          <Text style={styles.modalSubText}>Enter the PIN provided by the customer to start.</Text>
          <TextInput style={styles.pinInput} keyboardType="number-pad" maxLength={4} secureTextEntry value={pin} onChangeText={setPin} autoFocus />
          <TouchableOpacity style={[styles.modalSubmit, {height: 55}, pin.length < 4 && styles.disabledBtn]} onPress={onVerify} disabled={pin.length < 4 || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff', fontWeight:'800'}}>Verify</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff" },
  headerCenter: { alignItems: "center" },
  greeting: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  userName: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  premiumCard: { borderRadius: 24, padding: 24, marginBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10, shadowColor: '#1e1b4b', shadowOpacity: 0.3, shadowRadius: 20 },
  statusTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statusSub: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  textOnline: { color: '#10b981' },
  textOffline: { color: 'rgba(255,255,255,0.4)' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  navCard: { width: '31%', backgroundColor: '#fff', borderRadius: 20, padding: 15, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  navIconContainer: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  navValue: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  navLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginVertical: 20, fontSize: 13 },
  jobCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 15, elevation: 3 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  jobService: { fontSize: 16, fontWeight: '800' },
  badge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  locationText: { fontSize: 12, color: '#94a3b8', flex: 1 },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
  jobPrice: { fontSize: 18, fontWeight: '900', color: '#10b981' },
  btnRow: { flexDirection: 'row', gap: 8 },
  subBtn: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 12 },
  subBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  mainBtn: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#111827', borderRadius: 12 },
  mainBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  marketCard: { backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  alreadyBidCard: { backgroundColor: '#4f46e5', borderColor: '#4338ca' },
  marketTitle: { fontSize: 14, fontWeight: '700' },
  marketMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  marketPrice: { fontSize: 14, fontWeight: '800', color: '#10b981' },
  bidNowText: { fontSize: 10, color: '#6366f1', fontWeight: '800' },
  updateBidText: { fontSize: 10, color: '#fff', fontWeight: '900', textTransform: 'uppercase' },
  scheduledBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6, gap: 4 },
  scheduledText: { fontSize: 10, fontWeight: '700', color: '#6366f1' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
  premiumModal: { backgroundColor: '#fff', borderRadius: 30, padding: 25 },
  modalHeading: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  modalSubText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#f8fafc', borderRadius: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 15, borderRadius: 15, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalSubmit: { flex: 2, padding: 15, borderRadius: 15, alignItems: 'center', backgroundColor: '#111827' },
  modalInput: { backgroundColor: '#f8fafc', padding: 18, borderRadius: 15, fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  pinInput: { backgroundColor: '#f1f5f9', height: 70, borderRadius: 20, textAlign: 'center', fontSize: 32, fontWeight: '900', letterSpacing: 15, marginBottom: 20 },
  disabledBtn: { opacity: 0.5 },
  closeModalBtn: { position: 'absolute', right: 20, top: 20, zIndex: 10 },
  detailsScroll: { maxHeight: 350, marginVertical: 15 },
  inDepthContainer: { gap: 16 },
  detailSection: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  detailLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  requirementText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  infoRowLabel: { color: '#64748b', fontWeight: '600' },
  infoRowValue: { fontWeight: '900', color: '#10b981', fontSize: 16 },
  cancelText: { fontWeight: '700', color: '#64748b' },
  submitText: { color: '#fff', fontWeight: '800' },
  safetyCard: { backgroundColor: '#fff', width: '85%', borderRadius: 24, padding: 24, elevation: 20 },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  safetyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  safetyText: { fontSize: 15, color: '#64748b', lineHeight: 24, marginBottom: 25 },
  safetyActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
  confirmBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
  cancelLinkText: { color: '#94a3b8', fontWeight: '600' },
 
  specsContainer: {
    marginTop: 8,
    backgroundColor: '#f8fafc', // Light slate background
    borderRadius: 8,
    padding: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  specLabel: {
    fontSize: 14,
    color: '#64748b', // Muted text
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    color: '#1e293b', // Darker text
    fontWeight: '700',
  },
});